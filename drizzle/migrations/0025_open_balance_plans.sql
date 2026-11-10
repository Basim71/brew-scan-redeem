ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS total_cups integer;
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_plan_type_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_plan_type_check CHECK (plan_type IN ('daily','open_balance'));
UPDATE public.plans SET plan_type = 'open_balance', total_cups = max_redemptions_per_period
WHERE redemption_frequency <> 'daily' AND max_redemptions_per_period IS NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cups_total integer,
  ADD COLUMN IF NOT EXISTS cups_used integer NOT NULL DEFAULT 0;

UPDATE public.subscriptions s SET cups_total = p.total_cups,
  cups_used = (SELECT count(*) FROM public.orders o WHERE o.subscription_id = s.id AND o.status = 'approved')
FROM public.plans p WHERE p.id = s.plan_id AND p.plan_type = 'open_balance';

-- New/renewed subscriptions on an open-balance plan get the plan's cups.
CREATE OR REPLACE FUNCTION public.subscriptions_set_cups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_type text; v_total int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.plan_id IS NOT DISTINCT FROM OLD.plan_id THEN RETURN NEW; END IF;
  SELECT plan_type, total_cups INTO v_type, v_total FROM public.plans WHERE id = NEW.plan_id;
  IF v_type = 'open_balance' THEN
    NEW.cups_total := v_total; NEW.cups_used := 0;
  ELSE
    NEW.cups_total := NULL; NEW.cups_used := 0;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS subscriptions_set_cups_trg ON public.subscriptions;
CREATE TRIGGER subscriptions_set_cups_trg BEFORE INSERT OR UPDATE OF plan_id ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_set_cups();

-- Requesting a cup: open-balance subscriptions need a cup left
-- (approved + waiting orders count against the balance).
CREATE OR REPLACE FUNCTION public.orders_check_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.subscriptions%ROWTYPE; v_pending int;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE id = NEW.subscription_id FOR UPDATE;
  IF s.cups_total IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_pending FROM public.orders WHERE subscription_id = s.id AND status = 'pending';
  IF s.cups_used + v_pending >= s.cups_total THEN RAISE EXCEPTION 'balance_exhausted'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_check_balance_trg ON public.orders;
CREATE TRIGGER orders_check_balance_trg BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_check_balance();

-- Approval: daily plans keep the per-day limit; open-balance plans
-- take one cup atomically and give it back if the order is rejected.
CREATE OR REPLACE FUNCTION public.orders_enforce_daily_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_approved integer;
  v_total integer;
BEGIN
  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    UPDATE public.subscriptions SET cups_used = GREATEST(cups_used - 1, 0)
    WHERE id = NEW.subscription_id AND cups_total IS NOT NULL;
    RETURN NEW;
  END IF;
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT cups_total INTO v_total FROM public.subscriptions WHERE id = NEW.subscription_id FOR UPDATE;

  IF v_total IS NOT NULL THEN
    UPDATE public.subscriptions SET cups_used = cups_used + 1
    WHERE id = NEW.subscription_id AND cups_used < cups_total;
    IF NOT FOUND THEN RAISE EXCEPTION 'balance_exhausted'; END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.max_drinks_per_day, 1) INTO v_limit
  FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
  WHERE s.id = NEW.subscription_id;

  SELECT count(*) INTO v_approved FROM public.orders
  WHERE subscription_id = NEW.subscription_id AND order_date = NEW.order_date
    AND status = 'approved' AND id <> NEW.id;

  IF v_approved >= COALESCE(v_limit, 1) THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_app_subscriptions()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
 v_phone text;
 v_customer public.customers%ROWTYPE;
 v_subscriptions jsonb;
BEGIN
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 SELECT * INTO v_customer FROM public.customers WHERE phone = v_phone ORDER BY created_at DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found'; END IF;

 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'id', s.id, 'status', s.status, 'start_date', s.start_date, 'end_date', s.end_date,
   'bonus_days', COALESCE(s.bonus_days, 0),
   'used_today', (SELECT count(*) FROM public.orders uo
                  WHERE uo.subscription_id = s.id AND uo.customer_id = v_customer.id
                    AND uo.order_date = CURRENT_DATE AND uo.status IN ('pending', 'approved')),
   'cups_remaining', CASE WHEN s.cups_total IS NULL THEN NULL ELSE GREATEST(s.cups_total - s.cups_used, 0) END,
   'organization', jsonb_build_object(
     'id', o.id, 'name_ar', o.name_ar, 'name_en', o.name_en, 'logo_url', o.logo_url,
     'primary_color', COALESCE(o.primary_color, x.org_color),
     'branch_qr_mode', x.qr_mode,
     'branches', (
       SELECT COALESCE(jsonb_agg(jsonb_build_object(
         'id', cb.id, 'name_ar', cb.name_ar, 'name_en', cb.name_en,
         'address_ar', cb.address_ar, 'address_en', cb.address_en,
         'maps_url', cb.maps_url, 'phone', cb.phone,
         'opening_time', cb.opening_time, 'closing_time', cb.closing_time,
         'working_days', cb.working_days) ORDER BY cb.name_ar), '[]'::jsonb)
       FROM public.branches cb
       WHERE cb.organization_id = s.organization_id AND cb.is_active = true
         AND NOT EXISTS (SELECT 1 FROM public.plan_allowed_branches e
                         WHERE e.plan_id = p.id AND e.branch_id = cb.id AND e.mode = 'exclude')
         AND CASE
           WHEN x.has_include THEN EXISTS (SELECT 1 FROM public.plan_allowed_branches i
                         WHERE i.plan_id = p.id AND i.branch_id = cb.id AND i.mode = 'include')
           WHEN x.qr_mode = 'single' THEN true
           ELSE cb.id = s.branch_id
         END
     )),
   'branch', jsonb_build_object('id', b.id, 'name_ar', b.name_ar, 'name_en', b.name_en, 'branch_code', b.branch_code),
   'plan', jsonb_build_object('id', p.id, 'name_ar', p.name_ar, 'name_en', p.name_en, 'duration_days', p.duration_days,
     'max_drinks_per_day', p.max_drinks_per_day, 'color', p.color, 'plan_type', p.plan_type, 'total_cups', p.total_cups)
 ) ORDER BY s.end_date ASC), '[]'::jsonb)
 INTO v_subscriptions
 FROM public.subscriptions s
 JOIN public.organizations o ON o.id = s.organization_id
 JOIN public.branches b ON b.id = s.branch_id
 JOIN public.plans p ON p.id = s.plan_id
 CROSS JOIN LATERAL (
   SELECT COALESCE((SELECT os.branch_qr_mode FROM public.organization_settings os WHERE os.organization_id = s.organization_id LIMIT 1), 'per_branch') AS qr_mode,
          (SELECT os.primary_color FROM public.organization_settings os WHERE os.organization_id = s.organization_id LIMIT 1) AS org_color,
          EXISTS (SELECT 1 FROM public.plan_allowed_branches pi WHERE pi.plan_id = p.id AND pi.mode = 'include') AS has_include
 ) x
 WHERE s.customer_id = v_customer.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE;

 RETURN jsonb_build_object('success', true, 'customer_id', v_customer.id, 'subscriptions', v_subscriptions);
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_subscriptions() TO authenticated;