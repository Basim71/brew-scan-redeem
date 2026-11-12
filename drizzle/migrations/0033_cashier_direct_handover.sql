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

  IF v_order.fulfillment_stage IN ('preparing','ready') AND _stage = 'handover' THEN
    UPDATE public.orders SET fulfillment_stage = 'handover', handover_at = now(), handover_by = auth.uid(),
      handover_declined_at = NULL
    WHERE id = _order_id;
  ELSIF v_order.fulfillment_stage = 'handover' AND _stage IN ('preparing','ready') THEN
    UPDATE public.orders SET fulfillment_stage = 'preparing', handover_at = NULL, handover_by = NULL WHERE id = _order_id;
    _stage := 'preparing';
  ELSIF v_order.fulfillment_stage = 'preparing' AND _stage = 'ready' THEN
    UPDATE public.orders SET fulfillment_stage = 'ready', ready_at = now() WHERE id = _order_id;
  ELSE
    RAISE EXCEPTION 'invalid_stage_change';
  END IF;

  RETURN _stage;
END;
$function$;