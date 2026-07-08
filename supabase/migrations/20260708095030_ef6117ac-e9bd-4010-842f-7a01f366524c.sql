
-- Drop old prototype tables that conflict with the new schema
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.coffee_options CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;

-- Extend profiles (role stays in user_roles for security)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS branch_id uuid;

-- Enums
CREATE TYPE public.coupon_status       AS ENUM ('available', 'sold', 'expired');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE public.order_status        AS ENUM ('pending', 'approved', 'rejected');

-- =========================================================================
-- branches
-- =========================================================================
CREATE TABLE public.branches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar    text NOT NULL,
  name_en    text NOT NULL,
  address_ar text,
  address_en text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches readable by everyone"
  ON public.branches FOR SELECT
  USING (true);
CREATE POLICY "branches manageable by admins"
  ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill profiles FK now that branches exists
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- =========================================================================
-- plans
-- =========================================================================
CREATE TABLE public.plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans readable by everyone"
  ON public.plans FOR SELECT
  USING (true);
CREATE POLICY "plans manageable by admins"
  ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- coupons
-- =========================================================================
CREATE TABLE public.coupons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  plan_id    uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  branch_id  uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  price      numeric(10,2) NOT NULL CHECK (price >= 0),
  status     public.coupon_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  sold_at    timestamptz
);
CREATE INDEX coupons_status_idx ON public.coupons(status);
CREATE INDEX coupons_branch_idx ON public.coupons(branch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons visible to staff of branch"
  ON public.coupons FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'cashier') AND branch_id IS NOT DISTINCT FROM public.current_user_branch())
  );
CREATE POLICY "coupons manageable by admins"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cashiers can sell coupons in their branch"
  ON public.coupons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'cashier') AND branch_id IS NOT DISTINCT FROM public.current_user_branch())
  WITH CHECK (public.has_role(auth.uid(), 'cashier') AND branch_id IS NOT DISTINCT FROM public.current_user_branch());

-- =========================================================================
-- customers
-- =========================================================================
CREATE TABLE public.customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- /scan is anonymous: allow looking up by phone and self-registering
CREATE POLICY "customers readable"
  ON public.customers FOR SELECT
  USING (true);
CREATE POLICY "anyone can create a customer"
  ON public.customers FOR INSERT
  WITH CHECK (true);
CREATE POLICY "customers manageable by admins"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- drink_types
-- =========================================================================
CREATE TABLE public.drink_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar    text NOT NULL,
  name_en    text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drink_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drink_types TO authenticated;
GRANT ALL ON public.drink_types TO service_role;
ALTER TABLE public.drink_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drink_types readable by everyone"
  ON public.drink_types FOR SELECT
  USING (true);
CREATE POLICY "drink_types manageable by admins"
  ON public.drink_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- subscriptions
-- =========================================================================
CREATE TABLE public.subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  coupon_id   uuid NOT NULL REFERENCES public.coupons(id)   ON DELETE RESTRICT,
  plan_id     uuid NOT NULL REFERENCES public.plans(id)     ON DELETE RESTRICT,
  branch_id   uuid NOT NULL REFERENCES public.branches(id)  ON DELETE RESTRICT,
  start_date  date NOT NULL DEFAULT CURRENT_DATE,
  end_date    date NOT NULL,
  status      public.subscription_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id)
);
CREATE INDEX subscriptions_customer_idx ON public.subscriptions(customer_id);
CREATE INDEX subscriptions_branch_idx   ON public.subscriptions(branch_id);
GRANT SELECT ON public.subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions readable"
  ON public.subscriptions FOR SELECT
  USING (true);
CREATE POLICY "subscriptions manageable by admins"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cashiers can create subscriptions in their branch"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch());

-- =========================================================================
-- orders
-- =========================================================================
CREATE TABLE public.orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES public.customers(id)     ON DELETE CASCADE,
  branch_id       uuid NOT NULL REFERENCES public.branches(id)      ON DELETE RESTRICT,
  drink_type_id   uuid NOT NULL REFERENCES public.drink_types(id)   ON DELETE RESTRICT,
  order_date      date NOT NULL DEFAULT CURRENT_DATE,
  status          public.order_status NOT NULL DEFAULT 'pending',
  requested_at    timestamptz NOT NULL DEFAULT now(),
  approved_at     timestamptz,
  rejected_at     timestamptz,
  cashier_id      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_branch_status_idx ON public.orders(branch_id, status);
CREATE INDEX orders_subscription_idx  ON public.orders(subscription_id);

-- Enforce: at most one APPROVED order per subscription per day
CREATE UNIQUE INDEX orders_one_approved_per_day
  ON public.orders(subscription_id, order_date)
  WHERE status = 'approved';

GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders readable"
  ON public.orders FOR SELECT
  USING (true);
CREATE POLICY "anyone can create a pending order"
  ON public.orders FOR INSERT
  WITH CHECK (status = 'pending');
CREATE POLICY "cashiers can update orders in their branch"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch())
  );
CREATE POLICY "orders deletable by admins"
  ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: stamp approval / rejection timestamps and cashier
CREATE OR REPLACE FUNCTION public.stamp_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.cashier_id  := COALESCE(NEW.cashier_id, auth.uid());
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
    NEW.cashier_id  := COALESCE(NEW.cashier_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_stamp_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_status();
