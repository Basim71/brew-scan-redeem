-- 1. Employee record enrichment
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invited_by uuid;

-- 2. Let company staff read their colleagues' basic profile rows
CREATE OR REPLACE FUNCTION public.shares_organization_with(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members mine
    JOIN public.organization_members theirs
      ON theirs.organization_id = mine.organization_id
    WHERE mine.user_id = auth.uid()
      AND theirs.user_id = target_user
  );
$$;

REVOKE EXECUTE ON FUNCTION public.shares_organization_with(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.shares_organization_with(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.shares_organization_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_organization_with(uuid) TO service_role;

DROP POLICY IF EXISTS "profiles readable by organization peers" ON public.profiles;
CREATE POLICY "profiles readable by organization peers"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_organization_with(id));

-- 3. Record staff sign-in time
CREATE OR REPLACE FUNCTION public.touch_member_login()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.organization_members
  SET last_login_at = now()
  WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.touch_member_login() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_member_login() FROM anon;
GRANT EXECUTE ON FUNCTION public.touch_member_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_member_login() TO service_role;

-- 4. Company activity log
CREATE TABLE IF NOT EXISTS public.organization_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_label text,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  entity_type text,
  entity_id text,
  entity_label text,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_activity_log_org_created_idx
  ON public.organization_activity_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS organization_activity_log_actor_idx
  ON public.organization_activity_log (actor_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.organization_activity_log TO authenticated;
GRANT ALL ON public.organization_activity_log TO service_role;

ALTER TABLE public.organization_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity log readable by company admins"
ON public.organization_activity_log
FOR SELECT
TO authenticated
USING (public.has_organization_role(organization_id, ARRAY['owner','admin']));

CREATE POLICY "activity log readable by its actor"
ON public.organization_activity_log
FOR SELECT
TO authenticated
USING (actor_user_id = auth.uid());

CREATE POLICY "company members can append activity"
ON public.organization_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_organization_member(organization_id)
  AND actor_user_id = auth.uid()
);

CREATE POLICY "activity log visible to platform staff"
ON public.organization_activity_log
FOR SELECT
TO authenticated
USING (public.is_platform_user());