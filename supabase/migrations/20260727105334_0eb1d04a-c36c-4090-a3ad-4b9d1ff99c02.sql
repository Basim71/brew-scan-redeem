
-- 1. Extend plans with new fields
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#B8873A',
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS auto_renewal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_days integer,
  ADD COLUMN IF NOT EXISTS drinks_per_redemption integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS redemption_frequency text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS redemption_frequency_days integer,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_period integer,
  ADD COLUMN IF NOT EXISTS max_drinks_per_day integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_drinks_per_redemption integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS carry_unused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_carry_days integer,
  ADD COLUMN IF NOT EXISTS redemption_window_start time,
  ADD COLUMN IF NOT EXISTS redemption_window_end time,
  ADD COLUMN IF NOT EXISTS allowed_weekdays integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::integer[],
  ADD COLUMN IF NOT EXISTS max_selectable_drinks integer,
  ADD COLUMN IF NOT EXISTS allow_extra_shot boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_milk boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_syrup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_sugar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_addons integer,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill bilingual name fields from existing name
UPDATE public.plans SET name_en = COALESCE(name_en, name) WHERE name_en IS NULL;
UPDATE public.plans SET name_ar = COALESCE(name_ar, name) WHERE name_ar IS NULL;

ALTER TABLE public.plans
  ALTER COLUMN name_en SET NOT NULL,
  ALTER COLUMN name_ar SET NOT NULL;

-- 2. plan_allowed_drinks join table
CREATE TABLE IF NOT EXISTS public.plan_allowed_drinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  drink_type_id uuid NOT NULL REFERENCES public.drink_types(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, drink_type_id)
);
CREATE INDEX IF NOT EXISTS plan_allowed_drinks_plan_idx ON public.plan_allowed_drinks(plan_id);
CREATE INDEX IF NOT EXISTS plan_allowed_drinks_org_idx ON public.plan_allowed_drinks(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_allowed_drinks TO authenticated;
GRANT ALL ON public.plan_allowed_drinks TO service_role;

ALTER TABLE public.plan_allowed_drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_allowed_drinks readable by org members"
  ON public.plan_allowed_drinks FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "plan_allowed_drinks manageable by org managers"
  ON public.plan_allowed_drinks FOR ALL TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['owner','admin','manager']))
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner','admin','manager']));

-- 3. plan_allowed_branches join table
CREATE TABLE IF NOT EXISTS public.plan_allowed_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'include',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, branch_id)
);
CREATE INDEX IF NOT EXISTS plan_allowed_branches_plan_idx ON public.plan_allowed_branches(plan_id);
CREATE INDEX IF NOT EXISTS plan_allowed_branches_org_idx ON public.plan_allowed_branches(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_allowed_branches TO authenticated;
GRANT ALL ON public.plan_allowed_branches TO service_role;

ALTER TABLE public.plan_allowed_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_allowed_branches readable by org members"
  ON public.plan_allowed_branches FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "plan_allowed_branches manageable by org managers"
  ON public.plan_allowed_branches FOR ALL TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['owner','admin','manager']))
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner','admin','manager']));

-- 4. Server-side validation trigger for plans
CREATE OR REPLACE FUNCTION public.validate_plan_consumption()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.duration_days IS NULL OR new.duration_days <= 0 THEN
    RAISE EXCEPTION 'plan_invalid_duration';
  END IF;
  IF new.price IS NULL OR new.price < 0 THEN
    RAISE EXCEPTION 'plan_invalid_price';
  END IF;
  IF new.drinks_per_redemption < 1 THEN
    RAISE EXCEPTION 'plan_invalid_drinks_per_redemption';
  END IF;
  IF new.max_drinks_per_day < new.drinks_per_redemption THEN
    RAISE EXCEPTION 'plan_max_daily_below_redemption';
  END IF;
  IF new.max_drinks_per_redemption < 1 THEN
    RAISE EXCEPTION 'plan_invalid_max_per_redemption';
  END IF;
  IF new.redemption_frequency NOT IN ('daily','every_2_days','every_3_days','weekly','custom') THEN
    RAISE EXCEPTION 'plan_invalid_frequency';
  END IF;
  IF new.redemption_frequency = 'custom' AND (new.redemption_frequency_days IS NULL OR new.redemption_frequency_days < 1) THEN
    RAISE EXCEPTION 'plan_custom_frequency_days_required';
  END IF;
  IF new.redemption_frequency <> 'custom' AND new.redemption_frequency_days IS NOT NULL THEN
    new.redemption_frequency_days := NULL;
  END IF;
  IF new.carry_unused = false AND new.max_carry_days IS NOT NULL THEN
    new.max_carry_days := NULL;
  END IF;
  IF new.carry_unused = true AND (new.max_carry_days IS NULL OR new.max_carry_days < 1) THEN
    RAISE EXCEPTION 'plan_carry_days_required';
  END IF;
  IF new.redemption_window_start IS NOT NULL AND new.redemption_window_end IS NOT NULL
     AND new.redemption_window_end <= new.redemption_window_start THEN
    RAISE EXCEPTION 'plan_invalid_time_window';
  END IF;
  -- Keep legacy name in sync as fallback
  IF new.name IS NULL OR new.name = '' THEN
    new.name := COALESCE(new.name_en, new.name_ar);
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS validate_plan_consumption_trg ON public.plans;
CREATE TRIGGER validate_plan_consumption_trg
  BEFORE INSERT OR UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_plan_consumption();

-- Unique bilingual names per organization (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS plans_org_name_en_unique
  ON public.plans (organization_id, lower(name_en));
CREATE UNIQUE INDEX IF NOT EXISTS plans_org_name_ar_unique
  ON public.plans (organization_id, lower(name_ar));
