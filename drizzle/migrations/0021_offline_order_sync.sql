ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS offline_sync_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_offline_order boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS offline_served_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS orders_offline_sync_id_key ON public.orders(offline_sync_id) WHERE offline_sync_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cashier_sync_offline_orders(_orders jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r jsonb;
  v_sync uuid; v_sub uuid; v_branch uuid; v_drink uuid; v_served timestamptz;
  v_org uuid; s record; v_id uuid;
  results jsonb := '[]'::jsonb;
  n_ok int := 0; n_dup int := 0; n_rej int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF jsonb_typeof(_orders) <> 'array' OR jsonb_array_length(_orders) > 500 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(_orders) LOOP
    BEGIN
      v_sync := (r->>'offline_sync_id')::uuid;
      v_sub := (r->>'subscription_id')::uuid;
      v_branch := (r->>'branch_id')::uuid;
      v_drink := (r->>'drink_type_id')::uuid;
      v_served := COALESCE((r->>'served_at')::timestamptz, now());

      IF v_sync IS NULL OR v_sub IS NULL OR v_branch IS NULL OR v_drink IS NULL THEN
        RAISE EXCEPTION 'missing_fields';
      END IF;

      IF EXISTS (SELECT 1 FROM orders WHERE offline_sync_id = v_sync) THEN
        n_dup := n_dup + 1;
        results := results || jsonb_build_object('offline_sync_id', v_sync, 'result', 'duplicate');
        CONTINUE;
      END IF;

      IF v_served > now() + interval '10 minutes' OR v_served < now() - interval '7 days' THEN
        RAISE EXCEPTION 'invalid_served_at';
      END IF;

      SELECT organization_id INTO v_org FROM branches WHERE id = v_branch;
      IF v_org IS NULL OR NOT can_access_org(v_org) THEN RAISE EXCEPTION 'branch_forbidden'; END IF;

      SELECT * INTO s FROM subscriptions WHERE id = v_sub;
      IF s.id IS NULL OR s.organization_id <> v_org THEN RAISE EXCEPTION 'subscription_not_found'; END IF;
      IF s.branch_id IS NOT NULL AND NOT branch_shares_subscription(s.branch_id, v_branch) THEN
        RAISE EXCEPTION 'branch_not_allowed';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM drink_types WHERE id = v_drink AND organization_id = v_org) THEN
        RAISE EXCEPTION 'drink_not_found';
      END IF;

      INSERT INTO orders (subscription_id, customer_id, branch_id, drink_type_id, order_date,
        status, requested_at, cashier_id, organization_id, selected_options, customer_note,
        placed_via, offline_sync_id, is_offline_order, offline_served_at)
      VALUES (v_sub, s.customer_id, v_branch, v_drink,
        (v_served AT TIME ZONE 'Asia/Riyadh')::date, 'pending', v_served, auth.uid(), v_org,
        COALESCE(r->'selected_options', '[]'::jsonb), r->>'customer_note',
        COALESCE(r->>'method', 'offline'), v_sync, true, v_served)
      RETURNING id INTO v_id;

      UPDATE orders SET status = 'approved', approved_at = v_served,
        fulfillment_stage = 'picked_up', picked_up_at = v_served
      WHERE id = v_id;

      n_ok := n_ok + 1;
      results := results || jsonb_build_object('offline_sync_id', v_sync, 'result', 'synced', 'order_id', v_id);
    EXCEPTION WHEN unique_violation THEN
      n_dup := n_dup + 1;
      results := results || jsonb_build_object('offline_sync_id', v_sync, 'result', 'duplicate');
    WHEN OTHERS THEN
      n_rej := n_rej + 1;
      results := results || jsonb_build_object('offline_sync_id', r->>'offline_sync_id', 'result', 'rejected', 'reason', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('synced', n_ok, 'duplicates', n_dup, 'rejected', n_rej, 'results', results);
END;
$$;

REVOKE ALL ON FUNCTION public.cashier_sync_offline_orders(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cashier_sync_offline_orders(jsonb) TO authenticated, service_role;