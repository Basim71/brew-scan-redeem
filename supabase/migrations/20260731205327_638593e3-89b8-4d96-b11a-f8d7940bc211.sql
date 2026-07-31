ALTER TABLE public.plans RENAME COLUMN grace_period_days TO bonus_days;
ALTER TABLE public.plans ALTER COLUMN bonus_days SET DEFAULT 0;
UPDATE public.plans SET bonus_days = 0 WHERE bonus_days IS NULL;
ALTER TABLE public.plans ALTER COLUMN bonus_days SET NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS bonus_days integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.cashier_activate_registration(_request_id uuid, _coupon_id uuid, _start_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.customers (name, phone)
    VALUES (concat_ws(' ', v_request.first_name, v_request.last_name), v_request.phone)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = concat_ws(' ', v_request.first_name, v_request.last_name)
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
$function$;