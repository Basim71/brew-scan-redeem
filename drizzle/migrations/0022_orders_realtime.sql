-- Live order updates.
--
-- The cashier page and the iOS app used to find out about a change
-- only on their next poll (every 4-5 seconds each, so up to ~9
-- seconds end to end). Putting orders in the realtime publication
-- lets both listen: the cashier for its branch, the customer for
-- their own orders. Realtime only delivers rows the listener can
-- SELECT, so customers get a read policy for their own orders.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END;
$$;


-- Is this customers row the signed-in app customer? Definer, so the
-- policy doesn't depend on what customers RLS lets them read.
CREATE OR REPLACE FUNCTION public.customer_app_is_own_customer(_customer_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = _customer_id
      AND (c.auth_user_id = auth.uid() OR c.phone = public.customer_app_auth_phone())
  );
$function$;
REVOKE ALL ON FUNCTION public.customer_app_is_own_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_is_own_customer(uuid) TO authenticated;


DROP POLICY IF EXISTS "orders readable by own customer" ON public.orders;
CREATE POLICY "orders readable by own customer"
  ON public.orders FOR SELECT TO authenticated
  USING (customer_id IS NOT NULL AND public.customer_app_is_own_customer(customer_id));
