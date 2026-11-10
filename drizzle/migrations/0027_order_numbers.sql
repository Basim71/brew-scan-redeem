ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number integer;
CREATE OR REPLACE FUNCTION public.orders_assign_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.branch_id::text || COALESCE(NEW.order_date, CURRENT_DATE)::text));
    SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number FROM public.orders
     WHERE branch_id = NEW.branch_id AND order_date = COALESCE(NEW.order_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_assign_number ON public.orders;
CREATE TRIGGER orders_assign_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_assign_number();
WITH n AS (SELECT id, row_number() OVER (PARTITION BY branch_id, order_date ORDER BY created_at) rn FROM public.orders)
UPDATE public.orders o SET order_number = n.rn FROM n WHERE n.id = o.id AND o.order_number IS NULL;