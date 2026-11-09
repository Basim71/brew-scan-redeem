CREATE TABLE public.customer_device_keys (
 id uuid PRIMARY KEY,
 customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
 public_key text NOT NULL,
 platform text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
GRANT SELECT ON public.customer_device_keys TO authenticated;
GRANT ALL ON public.customer_device_keys TO service_role;
ALTER TABLE public.customer_device_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own device keys" ON public.customer_device_keys FOR SELECT TO authenticated USING (public.customer_app_is_own_customer(customer_id));
CREATE INDEX customer_device_keys_customer_idx ON public.customer_device_keys(customer_id) WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.customer_register_device_key(_key_id uuid, _public_key text, _platform text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_customer uuid; v_key public.customer_device_keys%ROWTYPE; v_der bytea;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT c.id INTO v_customer FROM public.customers c WHERE public.customer_app_is_own_customer(c.id) ORDER BY (c.auth_user_id = auth.uid()) DESC NULLS LAST, c.created_at DESC LIMIT 1;
 IF v_customer IS NULL THEN RAISE EXCEPTION 'customer_not_found'; END IF;
 IF _key_id IS NULL OR _platform IS NULL OR _platform NOT IN ('ios','android') OR _public_key IS NULL OR length(_public_key) > 256 THEN RAISE EXCEPTION 'invalid_device_key'; END IF;
 BEGIN v_der := decode(_public_key,'base64'); EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'invalid_device_key'; END;
 -- Standard id-ecPublicKey / prime256v1 SPKI with an uncompressed P-256 point.
 IF octet_length(v_der) <> 91 OR encode(substring(v_der from 1 for 27),'hex') <> '3059301306072a8648ce3d020106082a8648ce3d03010703420004' THEN RAISE EXCEPTION 'invalid_device_key'; END IF;
 INSERT INTO public.customer_device_keys(id,customer_id,public_key,platform)
 VALUES (_key_id,v_customer,_public_key,_platform) ON CONFLICT (id) DO NOTHING;
 SELECT * INTO v_key FROM public.customer_device_keys WHERE id = _key_id FOR UPDATE;
 IF v_key.customer_id <> v_customer THEN RAISE EXCEPTION 'key_owned_by_another_customer'; END IF;
 IF decode(v_key.public_key,'base64') <> v_der OR v_key.platform <> _platform THEN RAISE EXCEPTION 'key_id_immutable'; END IF;
 IF v_key.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'key_revoked'; END IF;
 RETURN jsonb_build_object('success',true);
END;
$$;
REVOKE ALL ON FUNCTION public.customer_register_device_key(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_register_device_key(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cashier_get_active_device_keys()
RETURNS TABLE(customer_id uuid,key_id uuid,public_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT k.customer_id,k.id,k.public_key FROM public.customer_device_keys k
 WHERE auth.uid() IS NOT NULL AND k.revoked_at IS NULL AND EXISTS (
  SELECT 1 FROM public.subscriptions s JOIN public.branches b ON b.id = s.branch_id
  WHERE s.customer_id = k.customer_id AND s.status = 'active'
   AND s.start_date <= (now() AT TIME ZONE 'Asia/Riyadh')::date AND s.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date
   AND (public.can_manage_org(s.organization_id) OR (public.has_organization_role(s.organization_id,ARRAY['cashier']) AND EXISTS (SELECT 1 FROM public.branches own_branch WHERE own_branch.id = public.current_user_branch() AND own_branch.organization_id = s.organization_id)))
 );
$$;
REVOKE ALL ON FUNCTION public.cashier_get_active_device_keys() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_get_active_device_keys() TO authenticated;

CREATE OR REPLACE FUNCTION public.cashier_sync_offline_orders(_orders jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
 r jsonb; v_sync uuid; v_sub uuid; v_branch uuid; v_drink uuid; v_served timestamptz;
 v_org uuid; s record; v_id uuid; v_day date; v_limit integer; v_used integer;
 results jsonb := '[]'::jsonb; n_ok int := 0; n_dup int := 0; n_rej int := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 IF _orders IS NULL OR jsonb_typeof(_orders) <> 'array' THEN RAISE EXCEPTION 'invalid_payload'; END IF;
 IF jsonb_array_length(_orders) > 500 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
 FOR r IN SELECT * FROM jsonb_array_elements(_orders) LOOP
  BEGIN
   v_sync := (r->>'offline_sync_id')::uuid; v_sub := (r->>'subscription_id')::uuid;
   v_branch := (r->>'branch_id')::uuid; v_drink := (r->>'drink_type_id')::uuid;
   v_served := COALESCE((r->>'served_at')::timestamptz,now());
   IF v_sync IS NULL OR v_sub IS NULL OR v_branch IS NULL OR v_drink IS NULL THEN RAISE EXCEPTION 'missing_fields'; END IF;
   SELECT organization_id INTO v_org FROM public.branches WHERE id = v_branch AND is_active = true;
   IF v_org IS NULL OR NOT (public.can_manage_org(v_org) OR (public.has_organization_role(v_org,ARRAY['cashier']) AND v_branch = public.current_user_branch())) THEN RAISE EXCEPTION 'branch_forbidden'; END IF;
   SELECT * INTO s FROM public.subscriptions WHERE id = v_sub FOR UPDATE;
   IF s.id IS NULL OR s.organization_id <> v_org THEN RAISE EXCEPTION 'subscription_not_found'; END IF;
   IF EXISTS (SELECT 1 FROM public.orders WHERE offline_sync_id = v_sync AND subscription_id = v_sub AND branch_id = v_branch) THEN
    n_dup := n_dup + 1; results := results || jsonb_build_object('offline_sync_id',v_sync,'result','duplicate'); CONTINUE;
   END IF;
   IF v_served > now() + interval '10 minutes' OR v_served < now() - interval '7 days' THEN RAISE EXCEPTION 'invalid_served_at'; END IF;
   v_day := (v_served AT TIME ZONE 'Asia/Riyadh')::date;
   IF s.status <> 'active' OR s.start_date > v_day OR s.end_date < v_day THEN RAISE EXCEPTION 'subscription_inactive'; END IF;
   IF EXISTS (SELECT 1 FROM public.plan_allowed_branches p WHERE p.plan_id = s.plan_id AND p.branch_id = v_branch AND p.mode = 'exclude') OR
      NOT (CASE WHEN EXISTS (SELECT 1 FROM public.plan_allowed_branches p WHERE p.plan_id = s.plan_id AND p.mode = 'include')
           THEN EXISTS (SELECT 1 FROM public.plan_allowed_branches p WHERE p.plan_id = s.plan_id AND p.branch_id = v_branch AND p.mode = 'include')
           ELSE s.branch_id IS NOT NULL AND public.branch_shares_subscription(s.branch_id,v_branch) END) THEN RAISE EXCEPTION 'branch_not_allowed'; END IF;
   IF NOT EXISTS (SELECT 1 FROM public.drink_types WHERE id = v_drink AND organization_id = v_org AND is_active = true) THEN RAISE EXCEPTION 'drink_not_found'; END IF;
   IF EXISTS (SELECT 1 FROM public.plan_allowed_drinks p WHERE p.plan_id = s.plan_id) AND NOT EXISTS (SELECT 1 FROM public.plan_allowed_drinks p WHERE p.plan_id = s.plan_id AND p.drink_type_id = v_drink) THEN RAISE EXCEPTION 'drink_not_allowed'; END IF;
   SELECT COALESCE(max_drinks_per_day,0) INTO v_limit FROM public.plans WHERE id = s.plan_id AND organization_id = v_org;
   SELECT count(*) INTO v_used FROM public.orders WHERE subscription_id = v_sub AND order_date = v_day AND status IN ('pending','approved');
   IF v_used >= COALESCE(v_limit,0) THEN RAISE EXCEPTION 'daily_limit_reached'; END IF;
   INSERT INTO public.orders(subscription_id,customer_id,branch_id,drink_type_id,order_date,status,requested_at,cashier_id,organization_id,selected_options,customer_note,placed_via,offline_sync_id,is_offline_order,offline_served_at)
   VALUES(v_sub,s.customer_id,v_branch,v_drink,v_day,'pending',v_served,auth.uid(),v_org,COALESCE(r->'selected_options','[]'::jsonb),r->>'customer_note','offline',v_sync,true,v_served) RETURNING id INTO v_id;
   UPDATE public.orders SET status = 'approved',approved_at = v_served,fulfillment_stage = 'picked_up',picked_up_at = v_served WHERE id = v_id;
   n_ok := n_ok + 1; results := results || jsonb_build_object('offline_sync_id',v_sync,'result','synced','order_id',v_id);
  EXCEPTION WHEN OTHERS THEN
   n_rej := n_rej + 1; results := results || jsonb_build_object('offline_sync_id',r->>'offline_sync_id','result','rejected','reason',SQLERRM);
  END;
 END LOOP;
 RETURN jsonb_build_object('synced',n_ok,'duplicates',n_dup,'rejected',n_rej,'results',results);
END;
$$;
REVOKE ALL ON FUNCTION public.cashier_sync_offline_orders(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_sync_offline_orders(jsonb) TO authenticated, service_role;