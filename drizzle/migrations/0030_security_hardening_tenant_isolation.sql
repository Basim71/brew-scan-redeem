-- 1) scan_session_is_valid: staff bypass only for same org (and branch if restricted)
CREATE OR REPLACE FUNCTION public.scan_session_is_valid(_session_token text, _phone text, _branch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND _branch_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.branches b ON b.id = _branch_id AND b.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND (om.branch_id IS NULL OR om.branch_id = _branch_id)
  ) THEN
    RETURN true;
  END IF;

  IF _session_token IS NULL OR length(btrim(_session_token)) < 20 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.customer_scan_sessions s
    WHERE s.token_hash = encode(digest(btrim(_session_token), 'sha256'), 'hex')
      AND s.phone = btrim(coalesce(_phone, ''))
      AND (s.branch_id IS NULL OR _branch_id IS NULL OR s.branch_id = _branch_id)
      AND s.expires_at > now()
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.scan_session_is_valid(text, text, uuid) FROM PUBLIC, anon, authenticated;

-- 2) organization_members guard trigger
CREATE OR REPLACE FUNCTION public.organization_members_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid := COALESCE(NEW.organization_id, OLD.organization_id);
  v_actor_role text;
  v_role_changed boolean := false;
BEGIN
  -- service role / internal jobs and platform accounts keep current behaviour
  IF auth.uid() IS NULL OR public.is_platform_user() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT m.role INTO v_actor_role
  FROM public.organization_members m
  WHERE m.organization_id = v_org AND m.user_id = auth.uid() AND m.status = 'active'
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('owner','admin') AND v_actor_role IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'only_owner_can_grant_privileged_role' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF v_actor_role IS DISTINCT FROM 'owner' THEN
    IF OLD.role = 'owner' THEN
      RAISE EXCEPTION 'cannot_modify_owner' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'only_owner_can_remove_admin' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      v_role_changed := NEW.role IS DISTINCT FROM OLD.role;
      IF v_role_changed AND (OLD.role IN ('owner','admin') OR NEW.role IN ('owner','admin')) THEN
        RAISE EXCEPTION 'only_owner_can_change_privileged_role' USING ERRCODE = '42501';
      END IF;
      IF OLD.user_id = auth.uid() AND (v_role_changed OR NEW.permissions IS DISTINCT FROM OLD.permissions) THEN
        RAISE EXCEPTION 'cannot_change_own_role_or_permissions' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- last-owner protection
  IF OLD.role = 'owner' AND OLD.status = 'active' AND (
       TG_OP = 'DELETE'
       OR NEW.role IS DISTINCT FROM 'owner'
       OR NEW.status IS DISTINCT FROM 'active'
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id)
     AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = OLD.organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members m
       WHERE m.organization_id = OLD.organization_id AND m.role = 'owner'
         AND m.status = 'active' AND m.id <> OLD.id)
  THEN
    RAISE EXCEPTION 'cannot_remove_last_owner' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS organization_members_guard ON public.organization_members;
CREATE TRIGGER organization_members_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.organization_members_guard();

-- 3) branches: safe public list, drop anon read
CREATE OR REPLACE FUNCTION public.scan_list_public_branches()
RETURNS TABLE(id uuid, name_en text, name_ar text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.id, b.name_en, b.name_ar
  FROM public.branches b
  WHERE b.is_active = true
  ORDER BY b.name_en;
$$;
GRANT EXECUTE ON FUNCTION public.scan_list_public_branches() TO anon, authenticated;

DROP POLICY IF EXISTS "public read" ON public.branches;
REVOKE SELECT ON public.branches FROM anon;

-- 4) customers: cashier registration function + tighten write check
CREATE OR REPLACE FUNCTION public.cashier_register_customer(_organization_id uuid, _name text, _phone text, _email text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text := btrim(coalesce(_name, ''));
  v_key text;
  v_email text := nullif(lower(btrim(coalesce(_email, ''))), '');
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_organization_role(_organization_id, ARRAY['owner','admin','manager','cashier']) THEN
    RAISE EXCEPTION 'not_organization_member' USING ERRCODE = '42501';
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 80 OR v_name ~ '[<>{}]' THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  v_key := public.scan_phone_key(_phone);
  IF v_key IS NULL OR v_key !~ '^5[0-9]{8}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('customer_phone:' || _organization_id::text || ':' || v_key));

  SELECT c.id INTO v_id FROM public.customers c
  WHERE c.organization_id = _organization_id AND public.scan_phone_key(c.phone) = v_key
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id; -- no duplicates: return existing customer
  END IF;

  INSERT INTO public.customers (organization_id, name, phone, email)
  VALUES (_organization_id, v_name, '+966' || v_key, v_email)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cashier_register_customer(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashier_register_customer(uuid, text, text, text) TO authenticated;

DROP POLICY IF EXISTS "org write" ON public.customers;
CREATE POLICY "org write" ON public.customers FOR ALL TO authenticated
USING (public.can_manage_org(organization_id) OR EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.customer_id = customers.id AND public.can_manage_org(s.organization_id)))
WITH CHECK (public.can_manage_org(organization_id) OR public.is_platform_user());

-- 5) support_agents read
DROP POLICY IF EXISTS support_agents_select ON public.support_agents;
CREATE POLICY support_agents_select ON public.support_agents FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_support_agent() OR public.is_support_manager());

-- 6) tickets update
DROP POLICY IF EXISTS tickets_update ON public.tickets;
CREATE POLICY tickets_update ON public.tickets FOR UPDATE TO authenticated
USING (
  (created_by_user_id = auth.uid() AND public.is_organization_member(organization_id))
  OR public.has_organization_role(organization_id, ARRAY['owner','admin'])
  OR public.is_support_agent())
WITH CHECK (
  (created_by_user_id = auth.uid() AND public.is_organization_member(organization_id))
  OR public.has_organization_role(organization_id, ARRAY['owner','admin'])
  OR public.is_support_agent());

-- 7) drink_options anon read: active only
DROP POLICY IF EXISTS "public read" ON public.drink_options;
CREATE POLICY "public read" ON public.drink_options FOR SELECT TO anon USING (is_active = true);