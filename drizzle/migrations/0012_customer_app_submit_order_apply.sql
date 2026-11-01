CREATE OR REPLACE FUNCTION public.customer_app_submit_order(
  _subscription_id uuid,
  _branch_id uuid,
  _drink_type_id uuid,
  _selected_option_ids uuid[] DEFAULT '{}'::uuid[],
  _customer_note text DEFAULT NULL::text
)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_customer public.customers%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_branch public.branches%ROWTYPE;
  v_qr_mode text;
  v_has_include boolean;
  v_now timestamp;
  v_today text;
  v_yesterday text;
  v_time time;
  v_is_open boolean := false;
  v_used_today integer := 0;
  v_selected_options jsonb := '[]'::jsonb;
  v_invalid_count integer := 0;
  v_order_id uuid;
BEGIN
  v_phone := public.customer_app_auth_phone();
  IF v_phone IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _subscription_id IS NULL OR _branch_id IS NULL OR _drink_type_id IS NULL THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  SELECT * INTO v_customer FROM public.customers
  WHERE phone = v_phone ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found'; END IF;
  SELECT * INTO v_subscription FROM public.subscriptions
  WHERE id = _subscription_id AND customer_id = v_customer.id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription_not_found'; END IF;
  IF v_subscription.status <> 'active'
     OR v_subscription.start_date > CURRENT_DATE
     OR v_subscription.end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'subscription_inactive';
  END IF;
  SELECT * INTO v_plan FROM public.plans WHERE id = v_subscription.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  SELECT * INTO v_branch FROM public.branches
  WHERE id = _branch_id
    AND organization_id = v_subscription.organization_id
    AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'branch_not_covered'; END IF;
  SELECT COALESCE((SELECT os.branch_qr_mode FROM public.organization_settings os
                   WHERE os.organization_id = v_subscription.organization_id LIMIT 1), 'per_branch'),
         EXISTS (SELECT 1 FROM public.plan_allowed_branches pi
                 WHERE pi.plan_id = v_plan.id AND pi.mode = 'include')
  INTO v_qr_mode, v_has_include;
  IF EXISTS (SELECT 1 FROM public.plan_allowed_branches e
             WHERE e.plan_id = v_plan.id AND e.branch_id = _branch_id AND e.mode = 'exclude')
     OR NOT (CASE
       WHEN v_has_include THEN EXISTS (SELECT 1 FROM public.plan_allowed_branches i
                                       WHERE i.plan_id = v_plan.id AND i.branch_id = _branch_id AND i.mode = 'include')
       WHEN v_qr_mode = 'single' THEN true
       ELSE _branch_id = v_subscription.branch_id
     END) THEN
    RAISE EXCEPTION 'branch_not_covered';
  END IF;
  v_now := now() AT TIME ZONE 'Asia/Riyadh';
  v_time := v_now::time;
  v_today := lower(to_char(v_now, 'Dy'));
  v_yesterday := lower(to_char(v_now - interval '1 day', 'Dy'));
  IF v_branch.closing_time > v_branch.opening_time THEN
    v_is_open := v_today = ANY(v_branch.working_days)
      AND v_time >= v_branch.opening_time AND v_time < v_branch.closing_time;
  ELSE
    v_is_open := (v_today = ANY(v_branch.working_days) AND v_time >= v_branch.opening_time)
      OR (v_yesterday = ANY(v_branch.working_days) AND v_time < v_branch.closing_time);
  END IF;
  IF NOT v_is_open THEN RAISE EXCEPTION 'branch_closed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.drink_types
                 WHERE id = _drink_type_id
                   AND organization_id = v_subscription.organization_id
                   AND is_active = true) THEN
    RAISE EXCEPTION 'invalid_drink';
  END IF;
  IF EXISTS (SELECT 1 FROM public.plan_allowed_drinks pad
             WHERE pad.plan_id = v_plan.id AND pad.organization_id = v_subscription.organization_id)
     AND NOT EXISTS (SELECT 1 FROM public.plan_allowed_drinks pad
                     WHERE pad.plan_id = v_plan.id AND pad.drink_type_id = _drink_type_id) THEN
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
  SELECT count(*) INTO v_used_today FROM public.orders
  WHERE subscription_id = v_subscription.id AND customer_id = v_customer.id
    AND order_date = CURRENT_DATE AND status IN ('pending', 'approved');
  IF v_used_today >= COALESCE(v_plan.max_drinks_per_day, 0) THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;
  INSERT INTO public.orders (subscription_id, customer_id, branch_id, drink_type_id, status, selected_options, customer_note)
  VALUES (v_subscription.id, v_customer.id, _branch_id, _drink_type_id, 'pending', v_selected_options,
    NULLIF(left(btrim(COALESCE(_customer_note, '')), 500), ''))
  RETURNING id INTO v_order_id;
  RETURN v_order_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_submit_order(uuid, uuid, uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_submit_order(uuid, uuid, uuid, uuid[], text) TO authenticated;