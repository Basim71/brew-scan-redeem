CREATE OR REPLACE FUNCTION public.customer_app_me()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
 _uid uuid := auth.uid();
 _phone text := nullif(auth.jwt() ->> 'phone', '');
 _cid uuid;
 _mn integer;
BEGIN
 IF _uid IS NULL THEN
 RETURN jsonb_build_object('customer_exists', false, 'customer_id', null, 'member_number', null);
 END IF;
 SELECT id INTO _cid FROM public.customers WHERE auth_user_id = _uid ORDER BY created_at DESC LIMIT 1;
 IF _cid IS NULL AND _phone IS NOT NULL THEN
 SELECT id INTO _cid FROM public.customers
 WHERE auth_user_id IS NULL AND regexp_replace(phone, '^\+', '') = regexp_replace(_phone, '^\+', '')
 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF _cid IS NOT NULL THEN
 UPDATE public.customers SET auth_user_id = _uid WHERE id = _cid;
 END IF;
 END IF;
 SELECT member_number INTO _mn FROM public.customers WHERE id = _cid;
 RETURN jsonb_build_object('customer_exists', _cid IS NOT NULL, 'customer_id', _cid, 'member_number', _mn,
   'member_number_display', CASE WHEN _mn IS NULL THEN NULL ELSE lpad(_mn::text, 2, '0') END);
END;
$function$;