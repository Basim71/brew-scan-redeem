-- organizations: website
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS website text;

-- organization_settings: locale
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS number_format text NOT NULL DEFAULT 'western';

-- organization_settings: customer experience copy
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS welcome_subtitle_ar text,
  ADD COLUMN IF NOT EXISTS welcome_subtitle_en text,
  ADD COLUMN IF NOT EXISTS empty_subscription_message_ar text,
  ADD COLUMN IF NOT EXISTS empty_subscription_message_en text,
  ADD COLUMN IF NOT EXISTS redeem_success_message_ar text,
  ADD COLUMN IF NOT EXISTS redeem_success_message_en text,
  ADD COLUMN IF NOT EXISTS expired_subscription_message_ar text,
  ADD COLUMN IF NOT EXISTS expired_subscription_message_en text,
  ADD COLUMN IF NOT EXISTS thank_you_message_ar text,
  ADD COLUMN IF NOT EXISTS thank_you_message_en text;

-- organization_settings: notifications
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS notification_providers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_events jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_templates jsonb NOT NULL DEFAULT '{}'::jsonb;

-- organization_settings: security
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS force_password_reset_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remember_devices boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allowed_countries text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS device_restriction text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS max_concurrent_sessions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_login_protection boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS failed_login_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS temporary_lock_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS auto_logout_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suspicious_login_detection boolean NOT NULL DEFAULT true;

-- branches: management fields
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS branch_code text,
  ADD COLUMN IF NOT EXISTS qr_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS maps_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS opening_time time without time zone NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS closing_time time without time zone NOT NULL DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS working_days text[] NOT NULL DEFAULT ARRAY['sun','mon','tue','wed','thu','fri','sat']::text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS branches_org_code_unique
  ON public.branches (organization_id, branch_code)
  WHERE branch_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS branches_qr_token_unique
  ON public.branches (qr_token);

-- auto-generate BR001, BR002, ... per organization
CREATE OR REPLACE FUNCTION public.assign_branch_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  IF new.branch_code IS NOT NULL AND btrim(new.branch_code) <> '' THEN
    RETURN new;
  END IF;

  SELECT COALESCE(
           MAX(NULLIF(regexp_replace(branch_code, '\D', '', 'g'), '')::integer),
           0
         ) + 1
  INTO next_number
  FROM public.branches
  WHERE organization_id = new.organization_id;

  new.branch_code := 'BR' || lpad(next_number::text, 3, '0');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS branches_assign_code ON public.branches;
CREATE TRIGGER branches_assign_code
  BEFORE INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.assign_branch_code();

DROP TRIGGER IF EXISTS branches_set_updated_at ON public.branches;
CREATE TRIGGER branches_set_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- backfill codes for existing branches
WITH ranked AS (
  SELECT id, organization_id,
         row_number() OVER (PARTITION BY organization_id ORDER BY created_at, id) AS rn
  FROM public.branches
  WHERE branch_code IS NULL
)
UPDATE public.branches b
SET branch_code = 'BR' || lpad(ranked.rn::text, 3, '0')
FROM ranked
WHERE b.id = ranked.id;