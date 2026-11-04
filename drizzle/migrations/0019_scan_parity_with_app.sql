CREATE OR REPLACE FUNCTION public.scan_phone_key(_phone text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT right(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), 9) $$;

CREATE OR REPLACE FUNCTION public.scan_find_customer(_phone text)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id FROM public.customers
  WHERE length(public.scan_phone_key(_phone)) = 9
    AND public.scan_phone_key(phone) = public.scan_phone_key(_phone)
  ORDER BY (phone = btrim(_phone)) DESC, created_at DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.scan_find_customer(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.scan_lookup(_phone text, _branch_id uuid, _session_token text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_sub public.subscriptions%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_used int;
  v_limit int;
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_active jsonb;
BEGIN
  IF _phone IS NULL OR length(btrim(_phone)) < 4 OR _branch_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  IF NOT public.scan_session_is_valid(_session_token, _phone, _branch_id) THEN
    RAISE EXCEPTION 'verification_required';
  END IF;
  SELECT * INTO v_customer FROM public.customers WHERE id = public.scan_find_customer(_phone);
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT * INTO v_sub FROM public.subscriptions
  WHERE customer_id = v_customer.id
    AND (branch_id IS NULL OR public.branch_shares_subscription(branch_id, _branch_id))
    AND status = 'active'
  ORDER BY (branch_id = _branch_id) DESC NULLS LAST, created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
  v_limit := GREATEST(COALESCE(v_plan.max_drinks_per_day, 1), 1);
  SELECT count(*) INTO v_used FROM public.orders
  WHERE subscription_id = v_sub.id AND order_date = v_today AND status IN ('approved','pending');

  SELECT jsonb_build_object('id', o.id, 'status', o.status, 'stage', o.fulfillment_stage)
  INTO v_active FROM public.orders o
  WHERE o.subscription_id = v_sub.id AND o.order_date = v_today
    AND (o.status = 'pending' OR (o.status = 'approved' AND o.fulfillment_stage IN ('preparing','ready','handover')))
  ORDER BY o.created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'customer', jsonb_build_object('id', v_customer.id, 'name', v_customer.name, 'phone', v_customer.phone),
    'subscription', jsonb_build_object(
      'id', v_sub.id, 'start_date', v_sub.start_date, 'end_date', v_sub.end_date, 'status', v_sub.status,
      'plan', CASE WHEN v_plan.id IS NULL THEN NULL ELSE
        jsonb_build_object('id', v_plan.id, 'name', v_plan.name, 'duration_days', v_plan.duration_days, 'max_drinks_per_day', v_limit) END
    ),
    'used_today', v_used,
    'max_drinks_per_day', v_limit,
    'remaining_today', GREATEST(v_limit - v_used, 0),
    'active_order', v_active
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.scan_submit_order(_phone text, _branch_id uuid, _drink_type_id uuid, _selected_option_ids uuid[] DEFAULT '{}'::uuid[], _customer_note text DEFAULT NULL::text, _session_token text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_sub_id uuid;
  v_plan_id uuid;
  v_limit int;
  v_used int;
  v_order_id uuid;
  v_selected_options jsonb := '[]'::jsonb;
  v_invalid_count integer := 0;
BEGIN
  IF NOT public.scan_session_is_valid(_session_token, _phone, _branch_id) THEN
    RAISE EXCEPTION 'verification_required';
  END IF;
  v_customer_id := public.scan_find_customer(_phone);
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'no_customer'; END IF;

  SELECT id, plan_id INTO v_sub_id, v_plan_id FROM public.subscriptions
  WHERE customer_id = v_customer_id
    AND (branch_id IS NULL OR public.branch_shares_subscription(branch_id, _branch_id))
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  ORDER BY (branch_id = _branch_id) DESC NULLS LAST, created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF v_sub_id IS NULL THEN RAISE EXCEPTION 'no_active_subscription'; END IF;

  SELECT GREATEST(COALESCE(max_drinks_per_day, 1), 1) INTO v_limit FROM public.plans WHERE id = v_plan_id;
  SELECT count(*) INTO v_used FROM public.orders
  WHERE subscription_id = v_sub_id AND order_date = (now() AT TIME ZONE 'utc')::date AND status IN ('approved','pending');
  IF v_used >= COALESCE(v_limit, 1) THEN RAISE EXCEPTION 'daily_limit_reached'; END IF;

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

  INSERT INTO public.orders (subscription_id, customer_id, branch_id, drink_type_id, status, selected_options, customer_note, placed_via)
  VALUES (v_sub_id, v_customer_id, _branch_id, _drink_type_id, 'pending', v_selected_options,
    NULLIF(left(btrim(COALESCE(_customer_note, '')), 500), ''), 'scan')
  RETURNING id INTO v_order_id;
  RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.orders_start_fulfillment()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.placed_via IN ('app','scan')
     AND NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.fulfillment_stage IS NULL THEN
    NEW.fulfillment_stage := 'preparing';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.scan_order_progress(_order_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('status', status::text, 'stage', fulfillment_stage)
  FROM public.orders WHERE id = _order_id AND placed_via = 'scan' LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.scan_order_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_order_progress(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.scan_confirm_pickup(_order_id uuid, _received boolean)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_stage text;
BEGIN
  SELECT fulfillment_stage INTO v_stage FROM public.orders
  WHERE id = _order_id AND placed_via = 'scan' AND status = 'approved' FOR UPDATE;
  IF v_stage IS DISTINCT FROM 'handover' THEN RAISE EXCEPTION 'not_in_handover'; END IF;
  IF _received THEN
    UPDATE public.orders SET fulfillment_stage = 'picked_up' WHERE id = _order_id;
    RETURN 'picked_up';
  ELSE
    UPDATE public.orders SET fulfillment_stage = 'ready' WHERE id = _order_id;
    RETURN 'ready';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.scan_confirm_pickup(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_confirm_pickup(uuid, boolean) TO anon, authenticated, service_role;