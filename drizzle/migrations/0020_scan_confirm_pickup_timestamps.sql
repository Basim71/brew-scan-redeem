CREATE OR REPLACE FUNCTION public.scan_confirm_pickup(_order_id uuid, _received boolean)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_stage text;
BEGIN
  SELECT fulfillment_stage INTO v_stage FROM public.orders
  WHERE id = _order_id AND placed_via = 'scan' AND status = 'approved' FOR UPDATE;
  IF v_stage IS DISTINCT FROM 'handover' THEN RAISE EXCEPTION 'not_in_handover'; END IF;
  IF _received THEN
    UPDATE public.orders SET fulfillment_stage = 'picked_up', picked_up_at = now() WHERE id = _order_id;
    RETURN 'picked_up';
  END IF;
  UPDATE public.orders SET fulfillment_stage = 'ready', handover_at = NULL, handover_declined_at = now() WHERE id = _order_id;
  RETURN 'ready';
END;
$$;