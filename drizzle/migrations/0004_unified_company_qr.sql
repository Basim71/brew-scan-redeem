ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS unified_qr_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS organization_settings_unified_qr_token_key
  ON public.organization_settings (unified_qr_token);

-- True when a subscription bought at _sub_branch may be used at _target_branch.
CREATE OR REPLACE FUNCTION public.branch_shares_subscription(_sub_branch uuid, _target_branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _sub_branch = _target_branch OR EXISTS (
    SELECT 1 FROM public.branches a
    JOIN public.branches b ON b.organization_id = a.organization_id
    JOIN public.organization_settings s ON s.organization_id = a.organization_id
    WHERE a.id = _sub_branch AND b.id = _target_branch AND s.branch_qr_mode = 'single'
  );
$$;
REVOKE ALL ON FUNCTION public.branch_shares_subscription(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.branch_shares_subscription(uuid, uuid) TO anon, authenticated, service_role;

-- Resolve a scanned QR token into the branches the customer may choose from.
CREATE OR REPLACE FUNCTION public.scan_resolve_qr(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_mode text;
  v_branch uuid;
  v_unified boolean := false;
BEGIN
  IF _token IS NULL OR btrim(_token) !~* '^[0-9a-f-]{36}$' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT b.id, b.organization_id INTO v_branch, v_org
  FROM public.branches b WHERE b.qr_token = btrim(_token)::uuid AND b.is_active LIMIT 1;

  IF v_org IS NULL THEN
    SELECT s.organization_id INTO v_org FROM public.organization_settings s
    WHERE s.unified_qr_token = btrim(_token)::uuid LIMIT 1;
    v_unified := v_org IS NOT NULL;
  END IF;

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT coalesce(s.branch_qr_mode, 'per_branch') INTO v_mode
  FROM public.organization_settings s WHERE s.organization_id = v_org;
  v_mode := coalesce(v_mode, 'per_branch');

  IF v_unified AND v_mode <> 'single' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'mode', v_mode,
    'organization_id', v_org,
    'branches', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name_en', b.name_en, 'name_ar', b.name_ar) ORDER BY b.name_en)
      FROM public.branches b
      WHERE b.organization_id = v_org AND b.is_active
        AND (v_mode = 'single' OR b.id = v_branch)
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.scan_resolve_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_resolve_qr(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.scan_lookup(_phone text, _branch_id uuid, _session_token text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT * INTO v_sub FROM public.subscriptions
  WHERE customer_id = v_customer.id
    AND public.branch_shares_subscription(branch_id, _branch_id)
    AND status = 'active'
  ORDER BY (branch_id = _branch_id) DESC, created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
  SELECT count(*) INTO v_used FROM public.orders
  WHERE subscription_id = v_sub.id AND order_date = v_today AND status = 'approved';

  RETURN jsonb_build_object(
    'found', true,
    'customer', jsonb_build_object('id', v_customer.id, 'name', v_customer.name),
    'subscription', jsonb_build_object(
      'id', v_sub.id, 'start_date', v_sub.start_date, 'end_date', v_sub.end_date, 'status', v_sub.status,
      'plan', CASE WHEN v_plan.id IS NULL THEN NULL ELSE
        jsonb_build_object('id', v_plan.id, 'name', v_plan.name, 'duration_days', v_plan.duration_days) END
    ),
    'used_today', v_used
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.scan_submit_order(_phone text, _branch_id uuid, _drink_type_id uuid, _selected_option_ids uuid[] DEFAULT '{}'::uuid[], _customer_note text DEFAULT NULL::text, _session_token text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'no_customer'; END IF;

  SELECT id INTO v_sub_id FROM public.subscriptions
  WHERE customer_id = v_customer_id
    AND public.branch_shares_subscription(branch_id, _branch_id)
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  ORDER BY (branch_id = _branch_id) DESC, created_at DESC
  LIMIT 1;
  IF v_sub_id IS NULL THEN RAISE EXCEPTION 'no_active_subscription'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.drink_types WHERE id = _drink_type_id AND is_active = true) THEN
    RAISE EXCEPTION 'invalid_drink';
  END IF;

  IF COALESCE(array_length(_selected_option_ids, 1), 0) > 0 THEN
    SELECT count(*) INTO v_invalid_count
    FROM unnest(_selected_option_ids) selected_id
    LEFT JOIN public.drink_options option_row ON option_row.id = selected_id AND option_row.is_active = true
    LEFT JOIN public.drink_option_groups group_row ON group_row.id = option_row.group_id AND group_row.drink_type_id = _drink_type_id
    WHERE option_row.id IS NULL OR group_row.id IS NULL;
    IF v_invalid_count > 0 THEN RAISE EXCEPTION 'invalid_drink_option'; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'group_id', group_row.id, 'group_name_en', group_row.name_en, 'group_name_ar', group_row.name_ar,
        'option_id', option_row.id, 'option_name_en', option_row.name_en, 'option_name_ar', option_row.name_ar
      ) ORDER BY group_row.sort_order, option_row.sort_order), '[]'::jsonb)
    INTO v_selected_options
    FROM public.drink_options option_row
    JOIN public.drink_option_groups group_row ON group_row.id = option_row.group_id
    WHERE option_row.id = ANY(_selected_option_ids) AND option_row.is_active = true AND group_row.drink_type_id = _drink_type_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.drink_option_groups required_group
    WHERE required_group.drink_type_id = _drink_type_id AND required_group.is_required = true
      AND NOT EXISTS (SELECT 1 FROM public.drink_options selected_option
        WHERE selected_option.group_id = required_group.id
          AND selected_option.id = ANY(COALESCE(_selected_option_ids, '{}'::uuid[])))
  ) THEN RAISE EXCEPTION 'required_drink_option_missing'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.drink_option_groups single_group
    JOIN public.drink_options selected_option ON selected_option.group_id = single_group.id
    WHERE single_group.drink_type_id = _drink_type_id AND single_group.selection_type = 'single'
      AND selected_option.id = ANY(COALESCE(_selected_option_ids, '{}'::uuid[]))
    GROUP BY single_group.id HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'too_many_options_for_single_group'; END IF;

  INSERT INTO public.orders (subscription_id, customer_id, branch_id, drink_type_id, status, selected_options, customer_note)
  VALUES (v_sub_id, v_customer_id, _branch_id, _drink_type_id, 'pending', v_selected_options,
    NULLIF(left(btrim(COALESCE(_customer_note, '')), 500), ''))
  RETURNING id INTO v_order_id;
  RETURN v_order_id;
END;
$function$;