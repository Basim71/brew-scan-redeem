ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

CREATE OR REPLACE FUNCTION public.customer_app_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _phone text := nullif(auth.jwt() ->> 'phone', '');
  _cid uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('customer_exists', false, 'customer_id', null);
  END IF;

  SELECT id INTO _cid FROM public.customers WHERE auth_user_id = _uid LIMIT 1;

  IF _cid IS NULL AND _phone IS NOT NULL THEN
    SELECT id INTO _cid FROM public.customers
     WHERE auth_user_id IS NULL
       AND regexp_replace(phone, '^\+', '') = regexp_replace(_phone, '^\+', '')
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE;
    IF _cid IS NOT NULL THEN
      UPDATE public.customers SET auth_user_id = _uid WHERE id = _cid;
    END IF;
  END IF;

  RETURN jsonb_build_object('customer_exists', _cid IS NOT NULL, 'customer_id', _cid);
END;
$$;

REVOKE ALL ON FUNCTION public.customer_app_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_me() TO authenticated;