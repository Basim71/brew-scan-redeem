
-- Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be publicly callable.
-- Keep anon access ONLY on public scan flow + pre-auth login lookup.
DO $$
DECLARE
  fn record;
  keep_anon text[] := ARRAY[
    'scan_lookup','scan_submit_order','scan_order_status',
    'scan_device_state','scan_register_request','scan_registration_status',
    'resolve_login_organization'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF NOT (fn.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn.sig);
    END IF;
  END LOOP;
END $$;

-- Restrict listing/reading drink-images objects via storage.objects to admins.
-- Public URL fetches (/object/public/...) still work because the bucket remains public.
DROP POLICY IF EXISTS "drink images publicly readable" ON storage.objects;
CREATE POLICY "admins list drink images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'drink-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
