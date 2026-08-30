-- 1) email columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.registration_requests ADD COLUMN IF NOT EXISTS email text;

-- 2) OTP codes (server-only)
CREATE TABLE IF NOT EXISTS public.customer_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  email text NOT NULL,
  branch_id uuid,
  customer_id uuid,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  device_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_otp_codes_phone_idx ON public.customer_otp_codes (phone, created_at DESC);
GRANT ALL ON public.customer_otp_codes TO service_role;
ALTER TABLE public.customer_otp_codes ENABLE ROW LEVEL SECURITY;

-- 3) verified scan sessions (server-only)
CREATE TABLE IF NOT EXISTS public.customer_scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  phone text NOT NULL,
  branch_id uuid,
  customer_id uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_scan_sessions_phone_idx ON public.customer_scan_sessions (phone);
GRANT ALL ON public.customer_scan_sessions TO service_role;
ALTER TABLE public.customer_scan_sessions ENABLE ROW LEVEL SECURITY;

-- 4) helper: is the caller verified for this phone/branch, or a staff member?
CREATE OR REPLACE FUNCTION public.scan_session_is_valid(_session_token text, _phone text, _branch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ) THEN
    RETURN true;
  END IF;

  IF _session_token IS NULL OR length(btrim(_session_token)) < 20 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.customer_scan_sessions s
    WHERE s.token_hash = encode(digest(btrim(_session_token), 'sha256'), 'hex')
      AND s.phone = btrim(coalesce(_phone, ''))
      AND (s.branch_id IS NULL OR _branch_id IS NULL OR s.branch_id = _branch_id)
      AND s.expires_at > now()
  );
END;
$$;

-- 5) scan_lookup now requires a verified session (staff exempt)
DROP FUNCTION IF EXISTS public.scan_lookup(text, uuid);
CREATE OR REPLACE FUNCTION public.scan_lookup(_phone text, _branch_id uuid, _session_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_sub public.subscriptions%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_used int;
  v_today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF _phone IS NULL OR length(btrim(_phone)) < 4 OR _branch_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF NOT public.scan_session_is_valid(_session_token, _phone, _branch_id) THEN
    RAISE EXCEPTION 'verification_required';
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE phone = btrim(_phone) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE customer_id = v_customer.id
    AND branch_id = _branch_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;

  SELECT count(*) INTO v_used
  FROM public.orders
  WHERE subscription_id = v_sub.id
    AND order_date = v_today
    AND status = 'approved';

  RETURN jsonb_build_object(
    'found', true,
    'customer', jsonb_build_object('id', v_customer.id, 'name', v_customer.name),
    'subscription', jsonb_build_object(
      'id', v_sub.id,
      'start_date', v_sub.start_date,
      'end_date', v_sub.end_date,
      'status', v_sub.status,
      'plan', CASE WHEN v_plan.id IS NULL THEN NULL ELSE
        jsonb_build_object('id', v_plan.id, 'name', v_plan.name, 'duration_days', v_plan.duration_days)
      END
    ),
    'used_today', v_used
  );
END;
$$;

-- 6) scan_submit_order now requires a verified session (staff exempt)
DROP FUNCTION IF EXISTS public.scan_submit_order(text, uuid, uuid, uuid[], text);
CREATE OR REPLACE FUNCTION public.scan_submit_order(
  _phone text,
  _branch_id uuid,
  _drink_type_id uuid,
  _selected_option_ids uuid[] DEFAULT '{}'::uuid[],
  _customer_note text DEFAULT NULL::text,
  _session_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id uuid;
  v_sub_id uuid;
  v_order_id uuid;
  v_selected_options jsonb := '[]'::jsonb;
  v_invalid_count integer := 0;
BEGIN
  IF NOT public.scan_session_is_valid(_session_token, _phone, _branch_id) THEN
    RAISE EXCEPTION 'verification_required';
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE phone = btrim(_phone) LIMIT 1;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'no_customer';
  END IF;

  SELECT id INTO v_sub_id
  FROM public.subscriptions
  WHERE customer_id = v_customer_id
    AND branch_id = _branch_id
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'no_active_subscription';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.drink_types WHERE id = _drink_type_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_drink';
  END IF;

  IF COALESCE(array_length(_selected_option_ids, 1), 0) > 0 THEN
    SELECT count(*)
    INTO v_invalid_count
    FROM unnest(_selected_option_ids) selected_id
    LEFT JOIN public.drink_options option_row
      ON option_row.id = selected_id AND option_row.is_active = true
    LEFT JOIN public.drink_option_groups group_row
      ON group_row.id = option_row.group_id AND group_row.drink_type_id = _drink_type_id
    WHERE option_row.id IS NULL OR group_row.id IS NULL;

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'invalid_drink_option';
    END IF;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'group_id', group_row.id,
          'group_name_en', group_row.name_en,
          'group_name_ar', group_row.name_ar,
          'option_id', option_row.id,
          'option_name_en', option_row.name_en,
          'option_name_ar', option_row.name_ar
        )
        ORDER BY group_row.sort_order, option_row.sort_order
      ),
      '[]'::jsonb
    )
    INTO v_selected_options
    FROM public.drink_options option_row
    JOIN public.drink_option_groups group_row ON group_row.id = option_row.group_id
    WHERE option_row.id = ANY(_selected_option_ids)
      AND option_row.is_active = true
      AND group_row.drink_type_id = _drink_type_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.drink_option_groups required_group
    WHERE required_group.drink_type_id = _drink_type_id
      AND required_group.is_required = true
      AND NOT EXISTS (
        SELECT 1 FROM public.drink_options selected_option
        WHERE selected_option.group_id = required_group.id
          AND selected_option.id = ANY(COALESCE(_selected_option_ids, '{}'::uuid[]))
      )
  ) THEN
    RAISE EXCEPTION 'required_drink_option_missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.drink_option_groups single_group
    JOIN public.drink_options selected_option ON selected_option.group_id = single_group.id
    WHERE single_group.drink_type_id = _drink_type_id
      AND single_group.selection_type = 'single'
      AND selected_option.id = ANY(COALESCE(_selected_option_ids, '{}'::uuid[]))
    GROUP BY single_group.id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'too_many_options_for_single_group';
  END IF;

  INSERT INTO public.orders (
    subscription_id, customer_id, branch_id, drink_type_id, status, selected_options, customer_note
  )
  VALUES (
    v_sub_id, v_customer_id, _branch_id, _drink_type_id, 'pending', v_selected_options,
    NULLIF(left(btrim(COALESCE(_customer_note, '')), 500), '')
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

-- 7) registration keeps the customer email
DROP FUNCTION IF EXISTS public.scan_register_request(text, text, text, uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.scan_register_request(
  _first_name text,
  _last_name text,
  _phone text,
  _branch_id uuid,
  _device_token text,
  _preferred_language text,
  _user_agent text,
  _email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_id uuid;
  v_existing_customer_id uuid;
  v_email text := nullif(btrim(lower(coalesce(_email, ''))), '');
BEGIN
  IF length(btrim(coalesce(_first_name, ''))) < 2 OR length(btrim(coalesce(_last_name, ''))) < 2 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  IF btrim(coalesce(_phone, '')) !~ '^05[0-9]{8}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF _branch_id IS NULL OR length(btrim(coalesce(_device_token, ''))) < 10 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT id INTO v_existing_customer_id FROM public.customers WHERE phone = btrim(_phone) LIMIT 1;

  IF v_existing_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET email = COALESCE(email, v_email)
    WHERE id = v_existing_customer_id;

    INSERT INTO public.customer_devices (
      device_token, customer_id, branch_id, user_agent, preferred_language, last_seen_at
    )
    VALUES (
      btrim(_device_token), v_existing_customer_id, _branch_id,
      left(coalesce(_user_agent, ''), 500),
      CASE WHEN _preferred_language = 'ar' THEN 'ar' ELSE 'en' END,
      now()
    )
    ON CONFLICT (device_token, branch_id)
    DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      user_agent = EXCLUDED.user_agent,
      preferred_language = EXCLUDED.preferred_language,
      last_seen_at = now();
  END IF;

  SELECT id INTO v_request_id
  FROM public.registration_requests
  WHERE branch_id = _branch_id
    AND (phone = btrim(_phone) OR device_token = btrim(_device_token))
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.registration_requests
    SET first_name = btrim(_first_name),
        last_name = btrim(_last_name),
        phone = btrim(_phone),
        email = v_email,
        device_token = btrim(_device_token),
        preferred_language = CASE WHEN _preferred_language = 'ar' THEN 'ar' ELSE 'en' END,
        user_agent = left(coalesce(_user_agent, ''), 500),
        updated_at = now()
    WHERE id = v_request_id;

    RETURN v_request_id;
  END IF;

  INSERT INTO public.registration_requests (
    first_name, last_name, phone, email, branch_id, device_token, preferred_language, user_agent
  )
  VALUES (
    btrim(_first_name), btrim(_last_name), btrim(_phone), v_email, _branch_id,
    btrim(_device_token),
    CASE WHEN _preferred_language = 'ar' THEN 'ar' ELSE 'en' END,
    left(coalesce(_user_agent, ''), 500)
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- 8) carry the email into the customer record on activation
CREATE OR REPLACE FUNCTION public.cashier_activate_registration(_request_id uuid, _coupon_id uuid, _start_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request public.registration_requests%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_customer_id uuid;
  v_subscription_id uuid;
  v_branch_id uuid;
  v_end_date date;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'cashier')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_request FROM public.registration_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'registration_not_found';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'registration_already_processed';
  END IF;
  IF public.has_role(auth.uid(), 'cashier')
     AND v_request.branch_id <> public.current_user_branch() THEN
    RAISE EXCEPTION 'wrong_branch';
  END IF;

  SELECT * INTO v_coupon FROM public.coupons
  WHERE id = _coupon_id AND status = 'available' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_available';
  END IF;

  v_branch_id := v_request.branch_id;

  IF v_coupon.branch_id IS NOT NULL AND v_coupon.branch_id <> v_branch_id THEN
    RAISE EXCEPTION 'coupon_wrong_branch';
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_coupon.plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE phone = v_request.phone LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, phone, email)
    VALUES (concat_ws(' ', v_request.first_name, v_request.last_name), v_request.phone, v_request.email)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = concat_ws(' ', v_request.first_name, v_request.last_name),
        email = COALESCE(email, v_request.email)
    WHERE id = v_customer_id;
  END IF;

  v_end_date := _start_date
    + (v_plan.duration_days - 1)
    + COALESCE(v_plan.bonus_days, 0);

  INSERT INTO public.subscriptions (
    customer_id, coupon_id, plan_id, branch_id, start_date, end_date, status, bonus_days
  )
  VALUES (
    v_customer_id, v_coupon.id, v_plan.id, v_branch_id, _start_date, v_end_date, 'active',
    COALESCE(v_plan.bonus_days, 0)
  )
  RETURNING id INTO v_subscription_id;

  UPDATE public.coupons
  SET status = 'sold', sold_at = now(), branch_id = v_branch_id
  WHERE id = v_coupon.id;

  UPDATE public.registration_requests
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.customer_devices (
    device_token, customer_id, branch_id, user_agent, preferred_language, last_seen_at
  )
  VALUES (
    v_request.device_token, v_customer_id, v_branch_id, v_request.user_agent,
    v_request.preferred_language, now()
  )
  ON CONFLICT (device_token, branch_id)
  DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    user_agent = EXCLUDED.user_agent,
    preferred_language = EXCLUDED.preferred_language,
    last_seen_at = now();

  RETURN v_subscription_id;
END;
$$;