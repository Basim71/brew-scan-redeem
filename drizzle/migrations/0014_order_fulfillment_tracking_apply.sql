-- Order tracking for the mobile app. The order's status
-- (pending / approved / rejected) stays as it is, so the daily
-- limit, analytics and dashboards that count 'approved' orders
-- are untouched. Orders placed from the app also move through a
-- separate fulfillment stage once the cashier approves them:
--   preparing -> ready -> handover -> picked_up
-- "handover" means the cashier is handing the drink over and is
-- waiting for the customer to confirm in the app that they got
-- it, so it can't be collected by someone else. If the customer
-- says they didn't get it, the order goes back to ready and the
-- cashier sees a warning.
-- Orders from the web scan flow (placed_via is null) keep the old
-- behaviour: approved and done.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS placed_via text,
  ADD COLUMN IF NOT EXISTS fulfillment_stage text,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_stage_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_stage_check
  CHECK (fulfillment_stage IS NULL OR fulfillment_stage IN ('preparing', 'ready', 'handover', 'picked_up'));

CREATE INDEX IF NOT EXISTS orders_branch_fulfillment_idx
  ON public.orders (branch_id, fulfillment_stage)
  WHERE fulfillment_stage IN ('preparing', 'ready', 'handover');

-- Approving an app order starts preparing it. Done in a trigger
-- so the cashier's existing approve button needs no change.
CREATE OR REPLACE FUNCTION public.orders_start_fulfillment()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.placed_via = 'app'
     AND NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.fulfillment_stage IS NULL THEN
    NEW.fulfillment_stage := 'preparing';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_start_fulfillment ON public.orders;
CREATE TRIGGER orders_start_fulfillment
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_start_fulfillment();

-- Same as 0011, but marks the order as placed from the app.
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

  -- Lock the subscription so two quick taps can't both pass the
  -- daily-limit check.
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

  -- Branch: active, same company, and covered by this subscription.
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

  -- Open now, in Riyadh. A close time earlier than the open time
  -- means the branch closes after midnight (yesterday's hours).
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

  -- Drink: active, this company, and on the plan if it limits drinks.
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

  -- Options: belong to this drink, required groups answered, at
  -- most one per pick-one group (same checks as scan_submit_order).
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

  -- Daily limit, counted like customer_app_order_menu.
  SELECT count(*) INTO v_used_today FROM public.orders
  WHERE subscription_id = v_subscription.id AND customer_id = v_customer.id
    AND order_date = CURRENT_DATE AND status IN ('pending', 'approved');
  IF v_used_today >= COALESCE(v_plan.max_drinks_per_day, 0) THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;

  INSERT INTO public.orders (subscription_id, customer_id, branch_id, drink_type_id, status, selected_options, customer_note, placed_via)
  VALUES (v_subscription.id, v_customer.id, _branch_id, _drink_type_id, 'pending', v_selected_options,
    NULLIF(left(btrim(COALESCE(_customer_note, '')), 500), ''), 'app')
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_submit_order(uuid, uuid, uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_submit_order(uuid, uuid, uuid, uuid[], text) TO authenticated;

-- Cashier moves an app order along: preparing -> ready,
-- ready -> handover (asks the customer to confirm), and
-- handover -> ready (cancel, e.g. the wrong person came up).
-- picked_up is only ever set by the customer's confirmation.
CREATE OR REPLACE FUNCTION public.cashier_set_order_stage(
  _order_id uuid,
  _stage text
)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'cashier') AND v_order.branch_id = public.current_user_branch())
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_order.status <> 'approved' OR v_order.fulfillment_stage IS NULL THEN
    RAISE EXCEPTION 'order_not_in_progress';
  END IF;

  IF v_order.fulfillment_stage = 'preparing' AND _stage = 'ready' THEN
    UPDATE public.orders SET fulfillment_stage = 'ready', ready_at = now() WHERE id = _order_id;
  ELSIF v_order.fulfillment_stage = 'ready' AND _stage = 'handover' THEN
    UPDATE public.orders SET fulfillment_stage = 'handover', handover_at = now(), handover_declined_at = NULL
    WHERE id = _order_id;
  ELSIF v_order.fulfillment_stage = 'handover' AND _stage = 'ready' THEN
    UPDATE public.orders SET fulfillment_stage = 'ready', handover_at = NULL WHERE id = _order_id;
  ELSE
    RAISE EXCEPTION 'invalid_stage_change';
  END IF;

  RETURN _stage;
END;
$function$;
REVOKE ALL ON FUNCTION public.cashier_set_order_stage(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_set_order_stage(uuid, text) TO authenticated;

-- The signed-in customer's recent app orders (last 18 hours),
-- newest first, with what the tracking screen shows.
CREATE OR REPLACE FUNCTION public.customer_app_recent_orders()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
BEGIN
  v_phone := public.customer_app_auth_phone();
  IF v_phone IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_data ORDER BY created_at DESC)
    FROM (
      SELECT o.created_at, jsonb_build_object(
        'id', o.id,
        'subscription_id', o.subscription_id,
        'status', o.status,
        'stage', o.fulfillment_stage,
        'created_at', o.created_at,
        'approved_at', o.approved_at,
        'rejected_at', o.rejected_at,
        'ready_at', o.ready_at,
        'handover_at', o.handover_at,
        'picked_up_at', o.picked_up_at,
        'selected_options', o.selected_options,
        'customer_note', o.customer_note,
        'drink', jsonb_build_object('id', d.id, 'name_ar', d.name_ar, 'name_en', d.name_en, 'image_url', d.image_url),
        'branch', jsonb_build_object('id', b.id, 'name_ar', b.name_ar, 'name_en', b.name_en),
        'organization', jsonb_build_object('id', org.id, 'name_ar', org.name_ar, 'name_en', org.name_en, 'logo_url', org.logo_url)
      ) AS row_data
      FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      JOIN public.drink_types d ON d.id = o.drink_type_id
      JOIN public.branches b ON b.id = o.branch_id
      JOIN public.organizations org ON org.id = b.organization_id
      WHERE c.phone = v_phone
        AND o.placed_via = 'app'
        AND o.created_at > now() - interval '18 hours'
      ORDER BY o.created_at DESC
      LIMIT 20
    ) recent
  ), '[]'::jsonb);
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_recent_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_recent_orders() TO authenticated;

-- The customer answers the cashier's handover request: received
-- finishes the order; not received sends it back to ready and
-- flags it for the cashier.
CREATE OR REPLACE FUNCTION public.customer_app_confirm_pickup(
  _order_id uuid,
  _received boolean
)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_order public.orders%ROWTYPE;
BEGIN
  v_phone := public.customer_app_auth_phone();
  IF v_phone IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT o.* INTO v_order FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE o.id = _order_id AND c.phone = v_phone
  FOR UPDATE OF o;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF v_order.fulfillment_stage <> 'handover' THEN
    RAISE EXCEPTION 'no_handover_pending';
  END IF;

  IF _received THEN
    UPDATE public.orders SET fulfillment_stage = 'picked_up', picked_up_at = now() WHERE id = _order_id;
    RETURN 'picked_up';
  END IF;

  UPDATE public.orders SET fulfillment_stage = 'ready', handover_at = NULL, handover_declined_at = now()
  WHERE id = _order_id;
  RETURN 'ready';
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_confirm_pickup(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_confirm_pickup(uuid, boolean) TO authenticated;
