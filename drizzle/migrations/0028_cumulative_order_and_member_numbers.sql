CREATE OR REPLACE FUNCTION public.orders_assign_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('order_no:' || NEW.branch_id::text));
    SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number FROM public.orders WHERE branch_id = NEW.branch_id;
  END IF;
  RETURN NEW;
END $$;
WITH n AS (SELECT id, row_number() OVER (PARTITION BY branch_id ORDER BY created_at, id) rn FROM public.orders)
UPDATE public.orders o SET order_number = n.rn FROM n WHERE n.id = o.id;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS member_number integer;
CREATE SEQUENCE IF NOT EXISTS public.customer_member_number_seq START 1;
WITH firsts AS (
  SELECT public.scan_phone_key(phone) k, min(created_at) first_at FROM public.customers GROUP BY 1
), ranked AS (SELECT k, row_number() OVER (ORDER BY first_at, k) rn FROM firsts)
UPDATE public.customers c SET member_number = r.rn FROM ranked r WHERE public.scan_phone_key(c.phone) = r.k;
SELECT setval('public.customer_member_number_seq', GREATEST(COALESCE((SELECT max(member_number) FROM public.customers), 0), 1), (SELECT max(member_number) FROM public.customers) IS NOT NULL);

CREATE OR REPLACE FUNCTION public.customers_assign_member_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  IF NEW.member_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('member_no:' || public.scan_phone_key(NEW.phone)));
    SELECT member_number INTO _n FROM public.customers
     WHERE public.scan_phone_key(phone) = public.scan_phone_key(NEW.phone) AND member_number IS NOT NULL LIMIT 1;
    NEW.member_number := COALESCE(_n, nextval('public.customer_member_number_seq'));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS customers_assign_member_number ON public.customers;
CREATE TRIGGER customers_assign_member_number BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.customers_assign_member_number();
GRANT USAGE ON SEQUENCE public.customer_member_number_seq TO service_role;