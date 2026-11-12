ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS handover_by uuid,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_handover_by uuid,
  ADD COLUMN IF NOT EXISTS dispute_handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by uuid,
  ADD COLUMN IF NOT EXISTS dispute_resolution text;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_stage_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_stage_check
  CHECK (fulfillment_stage IS NULL OR fulfillment_stage IN ('preparing','ready','handover','picked_up','disputed','refunded'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_dispute_resolution_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_dispute_resolution_check
  CHECK (dispute_resolution IS NULL OR dispute_resolution IN ('refunded','picked_up'));

CREATE INDEX IF NOT EXISTS orders_disputed_idx ON public.orders (branch_id) WHERE fulfillment_stage = 'disputed';
CREATE INDEX IF NOT EXISTS orders_customer_disputes_idx ON public.orders (customer_id) WHERE disputed_at IS NOT NULL;

-- Server-side lock: an app order can't be created while the same
-- customer (by phone) has an order waiting for pickup confirmation.
-- Fires inside customer_app_submit_order's INSERT.
CREATE OR REPLACE FUNCTION public.orders_block_pending_pickup()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pending uuid;
BEGIN
  IF NEW.placed_via IS DISTINCT FROM 'app' THEN RETURN NEW; END IF;
  SELECT o.id INTO v_pending
  FROM public.orders o
  JOIN public.customers pc ON pc.id = o.customer_id
  JOIN public.customers nc ON nc.id = NEW.customer_id AND nc.phone = pc.phone
  WHERE o.status = 'approved' AND o.fulfillment_stage = 'handover'
  ORDER BY o.handover_at DESC NULLS LAST
  LIMIT 1;
  IF v_pending IS NOT NULL THEN
    RAISE EXCEPTION 'pending_pickup_confirmation'
      USING DETAIL = v_pending::text,
            HINT = jsonb_build_object('order_id', v_pending)::text;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS orders_block_pending_pickup ON public.orders;
CREATE TRIGGER orders_block_pending_pickup BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_block_pending_pickup();

CREATE OR REPLACE FUNCTION public.cashier_set_order_stage(_order_id uuid, _stage text)
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
    UPDATE public.orders SET fulfillment_stage = 'handover', handover_at = now(), handover_by = auth.uid(),
      handover_declined_at = NULL
    WHERE id = _order_id;
  ELSIF v_order.fulfillment_stage = 'handover' AND _stage = 'ready' THEN
    UPDATE public.orders SET fulfillment_stage = 'ready', handover_at = NULL, handover_by = NULL WHERE id = _order_id;
  ELSE
    RAISE EXCEPTION 'invalid_stage_change';
  END IF;

  RETURN _stage;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_app_confirm_pickup(_order_id uuid, _received boolean)
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

  IF v_order.fulfillment_stage IS DISTINCT FROM 'handover' THEN
    RAISE EXCEPTION 'no_handover_pending';
  END IF;

  IF _received THEN
    UPDATE public.orders SET fulfillment_stage = 'picked_up', picked_up_at = now() WHERE id = _order_id;
    RETURN 'picked_up';
  END IF;

  -- Not received: report it. The cup stays used until the cafe decides.
  UPDATE public.orders SET fulfillment_stage = 'disputed', disputed_at = now(),
    handover_declined_at = now(),
    dispute_handover_by = v_order.handover_by, dispute_handover_at = v_order.handover_at
  WHERE id = _order_id;
  RETURN 'disputed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cashier_resolve_dispute(_order_id uuid, _resolution text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF _resolution IS NULL OR _resolution NOT IN ('refunded','picked_up') THEN RAISE EXCEPTION 'invalid_resolution'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.can_manage_org(v_order.organization_id)
    OR (public.has_role(auth.uid(), 'cashier') AND v_order.branch_id = public.current_user_branch())
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_order.fulfillment_stage IS DISTINCT FROM 'disputed' THEN RAISE EXCEPTION 'not_disputed'; END IF;

  IF _resolution = 'refunded' THEN
    -- Leaving 'approved' returns the cup (open balance) and frees the day slot.
    UPDATE public.orders SET status = 'rejected', fulfillment_stage = 'refunded',
      dispute_resolution = 'refunded', dispute_resolved_at = now(), dispute_resolved_by = auth.uid()
    WHERE id = _order_id;
  ELSE
    UPDATE public.orders SET fulfillment_stage = 'picked_up', picked_up_at = now(),
      dispute_resolution = 'picked_up', dispute_resolved_at = now(), dispute_resolved_by = auth.uid()
    WHERE id = _order_id;
  END IF;
  RETURN _resolution;
END;
$function$;
REVOKE ALL ON FUNCTION public.cashier_resolve_dispute(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_resolve_dispute(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cashier_customer_dispute_counts(_customer_ids uuid[])
 RETURNS TABLE(customer_id uuid, disputes integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT o.customer_id, count(*)::int
  FROM public.orders o
  WHERE o.customer_id = ANY(_customer_ids) AND o.disputed_at IS NOT NULL
    AND (o.organization_id IN (SELECT public.current_user_organization_ids()) OR public.has_role(auth.uid(), 'admin'))
  GROUP BY o.customer_id;
$function$;
REVOKE ALL ON FUNCTION public.cashier_customer_dispute_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_customer_dispute_counts(uuid[]) TO authenticated;

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
        'order_number', o.order_number,
        'subscription_id', o.subscription_id,
        'status', o.status,
        'stage', o.fulfillment_stage,
        'created_at', o.created_at,
        'approved_at', o.approved_at,
        'rejected_at', o.rejected_at,
        'ready_at', o.ready_at,
        'handover_at', COALESCE(o.handover_at, o.dispute_handover_at),
        'picked_up_at', o.picked_up_at,
        'disputed_at', o.disputed_at,
        'dispute_resolution', o.dispute_resolution,
        'dispute_resolved_at', o.dispute_resolved_at,
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
        AND (o.created_at > now() - interval '18 hours' OR o.fulfillment_stage IN ('handover','disputed'))
      ORDER BY o.created_at DESC
      LIMIT 20
    ) recent
  ), '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.orders_queue_push()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_event text;
BEGIN
  IF NEW.placed_via IS DISTINCT FROM 'app' THEN
    RETURN NEW;
  END IF;
  -- A dispute refund is settled in the app, not a "declined" push.
  IF NEW.fulfillment_stage = 'refunded' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    v_event := 'approved';
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    v_event := 'rejected';
  ELSIF NEW.fulfillment_stage = 'ready' AND OLD.fulfillment_stage = 'preparing' THEN
    v_event := 'ready';
  ELSIF NEW.fulfillment_stage = 'handover' AND OLD.fulfillment_stage IS DISTINCT FROM 'handover' THEN
    v_event := 'handover';
  END IF;

  IF v_event IS NOT NULL THEN
    INSERT INTO public.order_push_outbox (order_id, event)
    VALUES (NEW.id, v_event);
  END IF;

  RETURN NEW;
END;
$function$;