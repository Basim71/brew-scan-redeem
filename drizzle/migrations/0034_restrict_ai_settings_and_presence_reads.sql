DROP POLICY IF EXISTS platform_ai_settings_select ON public.platform_ai_settings;
CREATE POLICY platform_ai_settings_select ON public.platform_ai_settings FOR SELECT TO authenticated
  USING (public.is_platform_user(ARRAY['platform_owner'::platform_role, 'platform_admin'::platform_role]));
DROP POLICY IF EXISTS support_presence_select ON public.support_presence;
CREATE POLICY support_presence_select ON public.support_presence FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_support_agent() OR public.is_support_manager());