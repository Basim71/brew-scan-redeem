
-- Roles enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cashier');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches public read" ON public.branches FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'cashier' LIMIT 1
$$;

-- Admin manage branches
CREATE POLICY "branches admin write" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles admin all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coffee options catalog per branch
CREATE TABLE public.coffee_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coffee_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_options TO authenticated;
GRANT ALL ON public.coffee_options TO service_role;
ALTER TABLE public.coffee_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coffee public read" ON public.coffee_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "coffee admin all" ON public.coffee_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  customer_name TEXT,
  plan_name TEXT NOT NULL DEFAULT 'Daily Coffee',
  days_total INTEGER NOT NULL DEFAULT 30,
  days_used INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_phone_idx ON public.subscriptions(phone);
GRANT SELECT ON public.subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- Allow public read so /scan can lookup by phone. Sensitive: acceptable per spec (no login for customer).
CREATE POLICY "subs public read" ON public.subscriptions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "subs admin all" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  coffee_option_id UUID REFERENCES public.coffee_options(id) ON DELETE SET NULL,
  coffee_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX orders_branch_status_idx ON public.orders(branch_id, status);
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anon can create pending orders and read them (to poll status)
CREATE POLICY "orders public read" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "orders public insert" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Cashier can update orders in their branch
CREATE POLICY "orders cashier update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch())
  WITH CHECK (public.has_role(auth.uid(), 'cashier') AND branch_id = public.current_user_branch());

CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- When order is approved, increment days_used on subscription
CREATE OR REPLACE FUNCTION public.consume_subscription_day()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    UPDATE public.subscriptions
      SET days_used = days_used + 1, updated_at = now()
      WHERE id = NEW.subscription_id;
    NEW.approved_at = COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consume_day BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.consume_subscription_day();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed a demo branch + coffee options
INSERT INTO public.branches (name, code, address) VALUES
  ('KOB — Downtown', 'DOWNTOWN', '123 Roasted Bean St')
  ON CONFLICT (code) DO NOTHING;

INSERT INTO public.coffee_options (branch_id, name_en, name_ar)
SELECT b.id, x.en, x.ar FROM public.branches b
CROSS JOIN (VALUES
  ('Espresso','إسبريسو'),
  ('Americano','أمريكانو'),
  ('Cappuccino','كابتشينو'),
  ('Latte','لاتيه'),
  ('Flat White','فلات وايت'),
  ('Cortado','كورتادو')
) AS x(en, ar)
WHERE b.code = 'DOWNTOWN'
ON CONFLICT DO NOTHING;

-- Seed a demo subscription for testing
INSERT INTO public.subscriptions (phone, customer_name, plan_name, days_total, days_used, expires_at)
VALUES ('+1000000000', 'Demo Customer', '30-Day Coffee Pass', 30, 3, now() + interval '30 days')
ON CONFLICT DO NOTHING;
