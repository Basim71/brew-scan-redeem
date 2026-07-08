
-- 1) Lock down public SELECT on PII tables
DROP POLICY IF EXISTS "customers readable" ON public.customers;
DROP POLICY IF EXISTS "subscriptions readable" ON public.subscriptions;
DROP POLICY IF EXISTS "orders readable" ON public.orders;
DROP POLICY IF EXISTS "anyone can create a customer" ON public.customers;
DROP POLICY IF EXISTS "anyone can create a pending order" ON public.orders;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.customers FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.subscriptions FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;

-- 2) Staff SELECT policies for customers/subscriptions scoped to branch
CREATE POLICY "customers readable by staff"
  ON public.customers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'cashier')
      AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.customer_id = customers.id
          AND s.branch_id = public.current_user_branch()
      )
    )
  );

CREATE POLICY "subscriptions readable by staff of branch"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch())
  );

CREATE POLICY "orders readable by staff of branch"
  ON public.orders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch())
  );

-- 3) Admin can manage user_roles (already has 'admin all'); ensure self read remains.
-- (Nothing extra needed.)

-- 4) SECURITY DEFINER RPCs for the public /scan flow.
-- Return only what the customer needs, scoped to the branch they scanned.

CREATE OR REPLACE FUNCTION public.scan_lookup(_phone text, _branch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.scan_submit_order(_phone text, _branch_id uuid, _drink_type_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_sub_id uuid;
  v_order_id uuid;
BEGIN
  SELECT id INTO v_customer_id FROM public.customers WHERE phone = btrim(_phone) LIMIT 1;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'no_customer';
  END IF;

  SELECT id INTO v_sub_id
  FROM public.subscriptions
  WHERE customer_id = v_customer_id AND branch_id = _branch_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;
  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'no_active_subscription';
  END IF;

  INSERT INTO public.orders (subscription_id, customer_id, branch_id, drink_type_id, status)
  VALUES (v_sub_id, v_customer_id, _branch_id, _drink_type_id, 'pending')
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_order_status(_order_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::text FROM public.orders WHERE id = _order_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.scan_lookup(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_submit_order(text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_order_status(uuid) TO anon, authenticated;
