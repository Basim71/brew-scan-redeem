-- The daily cup limit comes from the plan.
--
-- orders_one_approved_per_day dates from before plans had
-- max_drinks_per_day: it allowed one approved order per
-- subscription per day, so the cashier couldn't approve the second
-- cup of a two-cups-a-day plan. It's replaced by a trigger that
-- checks the plan's own limit when an order is approved.

DROP INDEX IF EXISTS public.orders_one_approved_per_day;

CREATE INDEX IF NOT EXISTS orders_subscription_day_approved_idx
  ON public.orders (subscription_id, order_date)
  WHERE status = 'approved';


CREATE OR REPLACE FUNCTION public.orders_enforce_daily_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_approved integer;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- One approval at a time per subscription, so two cashiers can't
  -- both take the last cup.
  PERFORM 1 FROM public.subscriptions WHERE id = NEW.subscription_id FOR UPDATE;

  SELECT COALESCE(p.max_drinks_per_day, 1) INTO v_limit
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.id = NEW.subscription_id;

  SELECT count(*) INTO v_approved
  FROM public.orders
  WHERE subscription_id = NEW.subscription_id
    AND order_date = NEW.order_date
    AND status = 'approved'
    AND id <> NEW.id;

  IF v_approved >= COALESCE(v_limit, 1) THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_enforce_daily_limit ON public.orders;
CREATE TRIGGER orders_enforce_daily_limit
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_enforce_daily_limit();
