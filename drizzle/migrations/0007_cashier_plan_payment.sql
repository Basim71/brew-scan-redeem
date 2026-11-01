ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method text, ADD COLUMN IF NOT EXISTS amount_paid numeric;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_payment_method_chk CHECK (payment_method IS NULL OR payment_method IN ('cash','mada','visa','mastercard','apple_pay','other_card'));

CREATE OR REPLACE FUNCTION public.scan_set_request_plan(_request_id uuid, _plan_id uuid, _phone text, _session_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_req public.registration_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.registration_requests WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND OR v_req.phone <> btrim(_phone) THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT public.scan_session_is_valid(_session_token, v_req.phone, v_req.branch_id) THEN RAISE EXCEPTION 'session_invalid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = _plan_id AND organization_id = v_req.organization_id AND is_active AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'plan_not_available';
  END IF;
  UPDATE public.registration_requests SET requested_plan_id = _plan_id, updated_at = now() WHERE id = _request_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.scan_set_request_plan(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_set_request_plan(uuid, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cashier_activate_plan(_request_id uuid, _plan_id uuid, _start_date date, _payment_method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_req public.registration_requests%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_coupon_id uuid;
BEGIN
  IF _payment_method IS NULL OR _payment_method NOT IN ('cash','mada','visa','mastercard','apple_pay','other_card') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;
  SELECT * INTO v_req FROM public.registration_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT (public.can_manage_org(v_req.organization_id)
     OR (public.is_organization_member(v_req.organization_id) AND v_req.branch_id = public.current_user_branch())) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_plan FROM public.plans WHERE id = COALESCE(_plan_id, v_req.requested_plan_id) AND organization_id = v_req.organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  INSERT INTO public.coupons (code, plan_id, branch_id, organization_id, price, status)
  VALUES ('AUTO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)), v_plan.id, v_req.branch_id, v_req.organization_id, v_plan.price, 'available')
  RETURNING id INTO v_coupon_id;

  PERFORM public.cashier_activate_registration(_request_id, v_coupon_id, _start_date);

  UPDATE public.subscriptions SET payment_method = _payment_method, amount_paid = v_plan.price
  WHERE coupon_id = v_coupon_id;
  RETURN (SELECT id FROM public.subscriptions WHERE coupon_id = v_coupon_id);
END $$;
REVOKE ALL ON FUNCTION public.cashier_activate_plan(uuid, uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_activate_plan(uuid, uuid, date, text) TO authenticated;