create or replace function public.customer_app_auth_phone()
returns text
language sql stable security definer
set search_path = public, auth
as $$
 select '+' || regexp_replace(u.phone, '^\+', '')
 from auth.users u
 where u.id = auth.uid()
 and u.phone is not null
 and u.phone_confirmed_at is not null
$$;
revoke all on function public.customer_app_auth_phone() from public, anon;
grant execute on function public.customer_app_auth_phone() to authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_branch_plans(_branch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_phone text;
 v_branch public.branches%rowtype;
 v_organization public.organizations%rowtype;
 v_plans jsonb;
begin
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 if _branch_id is null then
 return jsonb_build_object('success', false, 'error', 'invalid_request');
 end if;
 select * into v_branch from public.branches where id = _branch_id and is_active = true limit 1;
 if not found then
 return jsonb_build_object('success', false, 'error', 'branch_not_found');
 end if;
 select * into v_organization from public.organizations where id = v_branch.organization_id and status = 'active' limit 1;
 if not found then
 return jsonb_build_object('success', false, 'error', 'organization_not_found');
 end if;
 select coalesce(jsonb_agg(plan_data order by plan_data_display_order, plan_data_name), '[]'::jsonb)
 into v_plans
 from (select
 p.display_order as plan_data_display_order, p.name_en as plan_data_name,
 jsonb_build_object('id', p.id, 'name_ar', p.name_ar, 'name_en', p.name_en, 'description_ar', p.description_ar, 'description_en', p.description_en, 'price', p.price, 'currency', p.currency, 'duration_days', p.duration_days, 'bonus_days', p.bonus_days, 'color', p.color, 'badge', p.badge, 'drinks_per_redemption', p.drinks_per_redemption, 'max_drinks_per_day', p.max_drinks_per_day, 'max_drinks_per_redemption', p.max_drinks_per_redemption, 'redemption_frequency', p.redemption_frequency,
 'all_drinks', not exists (select 1 from public.plan_allowed_drinks pad where pad.plan_id = p.id and pad.organization_id = v_branch.organization_id),
 'allowed_drinks_count', case
 when not exists (select 1 from public.plan_allowed_drinks pad where pad.plan_id = p.id and pad.organization_id = v_branch.organization_id)
 then (select count(*) from public.drink_types dt where dt.organization_id = v_branch.organization_id and dt.is_active = true)
 else (select count(*) from public.plan_allowed_drinks pad join public.drink_types dt on dt.id = pad.drink_type_id where pad.plan_id = p.id and pad.organization_id = v_branch.organization_id and dt.organization_id = v_branch.organization_id and dt.is_active = true)
 end,
 'allowed_drinks', (select coalesce(jsonb_agg(jsonb_build_object('id', dt.id, 'name_ar', dt.name_ar, 'name_en', dt.name_en, 'image_url', dt.image_url, 'calories', dt.calories, 'allergens', dt.allergens) order by dt.name_en), '[]'::jsonb)
 from public.drink_types dt
 where dt.organization_id = v_branch.organization_id and dt.is_active = true
 and (not exists (select 1 from public.plan_allowed_drinks pad_all where pad_all.plan_id = p.id and pad_all.organization_id = v_branch.organization_id)
 or exists (select 1 from public.plan_allowed_drinks pad_selected where pad_selected.plan_id = p.id and pad_selected.organization_id = v_branch.organization_id and pad_selected.drink_type_id = dt.id))),
 'all_branches', not exists (select 1 from public.plan_allowed_branches pab where pab.plan_id = p.id and pab.organization_id = v_branch.organization_id and pab.mode = 'include'),
 'branches', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'branch_code', b.branch_code, 'name_ar', b.name_ar, 'name_en', b.name_en) order by b.name_en), '[]'::jsonb)
 from public.branches b
 where b.organization_id = v_branch.organization_id and b.is_active = true
 and ((not exists (select 1 from public.plan_allowed_branches pab_all where pab_all.plan_id = p.id and pab_all.organization_id = v_branch.organization_id and pab_all.mode = 'include')
 and not exists (select 1 from public.plan_allowed_branches pab_ex where pab_ex.plan_id = p.id and pab_ex.branch_id = b.id and pab_ex.mode = 'exclude'))
 or (exists (select 1 from public.plan_allowed_branches pab_in where pab_in.plan_id = p.id and pab_in.branch_id = b.id and pab_in.mode = 'include')
 and not exists (select 1 from public.plan_allowed_branches pab_ex2 where pab_ex2.plan_id = p.id and pab_ex2.branch_id = b.id and pab_ex2.mode = 'exclude'))))) as plan_data
 from public.plans p
 where p.organization_id = v_branch.organization_id and p.is_active = true and p.is_hidden = false and p.archived_at is null
 and ((not exists (select 1 from public.plan_allowed_branches pab where pab.plan_id = p.id and pab.organization_id = v_branch.organization_id and pab.mode = 'include')
 and not exists (select 1 from public.plan_allowed_branches pab where pab.plan_id = p.id and pab.branch_id = v_branch.id and pab.mode = 'exclude'))
 or (exists (select 1 from public.plan_allowed_branches pab where pab.plan_id = p.id and pab.branch_id = v_branch.id and pab.mode = 'include')
 and not exists (select 1 from public.plan_allowed_branches pab where pab.plan_id = p.id and pab.branch_id = v_branch.id and pab.mode = 'exclude')))) available_plans;
 return jsonb_build_object('success', true, 'brand', jsonb_build_object('id', v_organization.id, 'name_ar', v_organization.name_ar, 'name_en', v_organization.name_en, 'logo_url', v_organization.logo_url, 'primary_color', v_organization.primary_color, 'secondary_color', v_organization.secondary_color), 'scanned_branch', jsonb_build_object('id', v_branch.id, 'branch_code', v_branch.branch_code, 'name_ar', v_branch.name_ar, 'name_en', v_branch.name_en), 'plans', v_plans);
end;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_branch_plans(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_branch_plans(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_scan_branch(_qr_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_phone text;
 v_qr_token text;
 v_branch public.branches%rowtype;
begin
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 v_qr_token := trim(_qr_token);
 if coalesce(v_qr_token, '') = '' then
 return jsonb_build_object('success', false, 'error', 'invalid_request');
 end if;
 select * into v_branch from public.branches where qr_token::text = v_qr_token limit 1;
 if not found then
 return jsonb_build_object('success', false, 'error', 'invalid_qr');
 end if;
 if coalesce(v_branch.is_active, false) = false then
 return jsonb_build_object('success', false, 'error', 'branch_inactive');
 end if;
 return jsonb_build_object('success', true, 'branch', jsonb_build_object('id', v_branch.id, 'organization_id', v_branch.organization_id, 'branch_code', v_branch.branch_code, 'name_ar', v_branch.name_ar, 'name_en', v_branch.name_en, 'logo_url', v_branch.logo_url, 'opening_time', v_branch.opening_time, 'closing_time', v_branch.closing_time));
end;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_scan_branch(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_scan_branch(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
 v_phone text;
 v_customer public.customers%ROWTYPE;
BEGIN
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 SELECT c.* INTO v_customer FROM public.customers c WHERE c.phone = v_phone ORDER BY c.created_at DESC LIMIT 1;
 IF NOT FOUND THEN
 RETURN jsonb_build_object('found', false);
 END IF;
 RETURN jsonb_build_object('found', true, 'customer', jsonb_build_object('id', v_customer.id, 'name', v_customer.name, 'phone', v_customer.phone, 'email', v_customer.email, 'organization_id', v_customer.organization_id));
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_subscriptions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_phone text;
 v_customer public.customers%ROWTYPE;
 v_subscriptions jsonb;
BEGIN
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 SELECT * INTO v_customer FROM public.customers WHERE phone = v_phone ORDER BY created_at DESC LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'customer_not_found';
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'status', s.status, 'start_date', s.start_date, 'end_date', s.end_date, 'bonus_days', COALESCE(s.bonus_days, 0), 'organization', jsonb_build_object('id', o.id, 'name_ar', o.name_ar, 'name_en', o.name_en, 'logo_url', o.logo_url), 'branch', jsonb_build_object('id', b.id, 'name_ar', b.name_ar, 'name_en', b.name_en, 'branch_code', b.branch_code), 'plan', jsonb_build_object('id', p.id, 'name_ar', p.name_ar, 'name_en', p.name_en, 'duration_days', p.duration_days, 'max_drinks_per_day', p.max_drinks_per_day, 'color', p.color)) ORDER BY s.end_date ASC), '[]'::jsonb)
 INTO v_subscriptions
 FROM public.subscriptions s
 JOIN public.organizations o ON o.id = s.organization_id
 JOIN public.branches b ON b.id = s.branch_id
 JOIN public.plans p ON p.id = s.plan_id
 WHERE s.customer_id = v_customer.id AND s.status = 'active' AND s.end_date >= CURRENT_DATE;
 RETURN jsonb_build_object('success', true, 'customer_id', v_customer.id, 'subscriptions', v_subscriptions);
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_subscriptions() TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_order_menu(_subscription_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_phone text;
 v_customer public.customers%ROWTYPE;
 v_subscription public.subscriptions%ROWTYPE;
 v_plan public.plans%ROWTYPE;
 v_branch public.branches%ROWTYPE;
 v_organization public.organizations%ROWTYPE;
 v_used_today integer := 0;
 v_remaining_today integer := 0;
 v_has_restricted_drinks boolean := false;
 v_drinks jsonb;
BEGIN
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 IF _subscription_id IS NULL THEN
 RAISE EXCEPTION 'invalid_request';
 END IF;
 SELECT * INTO v_customer FROM public.customers WHERE phone = v_phone ORDER BY created_at DESC LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'customer_not_found';
 END IF;
 SELECT * INTO v_subscription FROM public.subscriptions WHERE id = _subscription_id AND customer_id = v_customer.id LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'subscription_not_found';
 END IF;
 IF v_subscription.status <> 'active' OR v_subscription.start_date > CURRENT_DATE OR v_subscription.end_date < CURRENT_DATE THEN
 RAISE EXCEPTION 'subscription_inactive';
 END IF;
 SELECT * INTO v_plan FROM public.plans WHERE id = v_subscription.plan_id LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'plan_not_found';
 END IF;
 SELECT * INTO v_branch FROM public.branches WHERE id = v_subscription.branch_id LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'branch_not_found';
 END IF;
 SELECT * INTO v_organization FROM public.organizations WHERE id = v_subscription.organization_id LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'organization_not_found';
 END IF;
 SELECT COUNT(*) INTO v_used_today FROM public.orders
 WHERE subscription_id = v_subscription.id AND customer_id = v_customer.id AND order_date = CURRENT_DATE AND status IN ('pending', 'approved');
 v_remaining_today := GREATEST(COALESCE(v_plan.max_drinks_per_day, 0) - v_used_today, 0);
 SELECT EXISTS (SELECT 1 FROM public.plan_allowed_drinks pad WHERE pad.plan_id = v_plan.id AND pad.organization_id = v_subscription.organization_id)
 INTO v_has_restricted_drinks;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'name_ar', d.name_ar, 'name_en', d.name_en, 'image_url', d.image_url, 'image_path', d.image_path, 'calories', d.calories, 'allergens', COALESCE(to_jsonb(d.allergens), '[]'::jsonb),
 'option_groups', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name_ar', g.name_ar, 'name_en', g.name_en, 'selection_type', g.selection_type, 'is_required', g.is_required, 'sort_order', g.sort_order,
 'options', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', opt.id, 'name_ar', opt.name_ar, 'name_en', opt.name_en, 'sort_order', opt.sort_order) ORDER BY opt.sort_order, opt.name_en)
 FROM public.drink_options opt WHERE opt.group_id = g.id AND opt.organization_id = v_subscription.organization_id AND opt.is_active = true), '[]'::jsonb)) ORDER BY g.sort_order, g.name_en)
 FROM public.drink_option_groups g WHERE g.drink_type_id = d.id AND g.organization_id = v_subscription.organization_id), '[]'::jsonb)) ORDER BY d.name_en), '[]'::jsonb)
 INTO v_drinks
 FROM public.drink_types d
 WHERE d.organization_id = v_subscription.organization_id AND d.is_active = true
 AND (v_has_restricted_drinks = false OR EXISTS (SELECT 1 FROM public.plan_allowed_drinks pad WHERE pad.plan_id = v_plan.id AND pad.organization_id = v_subscription.organization_id AND pad.drink_type_id = d.id));
 RETURN jsonb_build_object('success', true, 'subscription', jsonb_build_object('id', v_subscription.id, 'status', v_subscription.status, 'start_date', v_subscription.start_date, 'end_date', v_subscription.end_date), 'organization', jsonb_build_object('id', v_organization.id, 'name_ar', v_organization.name_ar, 'name_en', v_organization.name_en, 'logo_url', v_organization.logo_url), 'branch', jsonb_build_object('id', v_branch.id, 'name_ar', v_branch.name_ar, 'name_en', v_branch.name_en, 'branch_code', v_branch.branch_code), 'plan', jsonb_build_object('id', v_plan.id, 'name_ar', v_plan.name_ar, 'name_en', v_plan.name_en, 'max_drinks_per_day', v_plan.max_drinks_per_day, 'color', v_plan.color), 'daily_limit', COALESCE(v_plan.max_drinks_per_day, 0), 'used_today', v_used_today, 'remaining_today', v_remaining_today, 'can_order', v_remaining_today > 0, 'drinks', v_drinks);
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_order_menu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_order_menu(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_request_subscription(_branch_id uuid, _plan_id uuid, _device_token text DEFAULT NULL::text, _preferred_language text DEFAULT 'en'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_phone text;
 v_customer public.customers%ROWTYPE;
 v_branch public.branches%ROWTYPE;
 v_plan public.plans%ROWTYPE;
 v_request_id uuid;
 v_first_name text;
 v_last_name text;
 v_device_token text;
 v_existing_request uuid;
BEGIN
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 IF _branch_id IS NULL OR _plan_id IS NULL THEN
 RAISE EXCEPTION 'invalid_request';
 END IF;
 SELECT * INTO v_customer FROM public.customers WHERE phone = v_phone ORDER BY created_at DESC LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'customer_not_found';
 END IF;
 SELECT * INTO v_branch FROM public.branches WHERE id = _branch_id AND is_active = true LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'branch_not_found';
 END IF;
 SELECT * INTO v_plan FROM public.plans
 WHERE id = _plan_id AND organization_id = v_branch.organization_id AND is_active = true AND COALESCE(is_hidden, false) = false AND archived_at IS NULL
 LIMIT 1;
 IF NOT FOUND THEN
 RAISE EXCEPTION 'plan_not_available';
 END IF;
 IF EXISTS (SELECT 1 FROM public.plan_allowed_branches pab WHERE pab.plan_id = v_plan.id AND pab.organization_id = v_branch.organization_id) THEN
 IF EXISTS (SELECT 1 FROM public.plan_allowed_branches pab WHERE pab.plan_id = v_plan.id AND pab.organization_id = v_branch.organization_id AND pab.mode = 'include') THEN
 IF NOT EXISTS (SELECT 1 FROM public.plan_allowed_branches pab WHERE pab.plan_id = v_plan.id AND pab.organization_id = v_branch.organization_id AND pab.mode = 'include' AND pab.branch_id = v_branch.id) THEN
 RAISE EXCEPTION 'plan_not_available_for_branch';
 END IF;
 ELSE
 IF EXISTS (SELECT 1 FROM public.plan_allowed_branches pab WHERE pab.plan_id = v_plan.id AND pab.organization_id = v_branch.organization_id AND pab.mode = 'exclude' AND pab.branch_id = v_branch.id) THEN
 RAISE EXCEPTION 'plan_not_available_for_branch';
 END IF;
 END IF;
 END IF;
 SELECT id INTO v_existing_request FROM public.registration_requests
 WHERE phone = v_phone AND branch_id = v_branch.id AND requested_plan_id = v_plan.id AND status = 'pending'
 ORDER BY created_at DESC LIMIT 1;
 IF v_existing_request IS NOT NULL THEN
 RETURN jsonb_build_object('success', true, 'already_pending', true, 'request_id', v_existing_request, 'status', 'pending');
 END IF;
 v_first_name := COALESCE(NULLIF(split_part(btrim(v_customer.name), ' ', 1), ''), btrim(v_customer.name));
 v_last_name := NULLIF(btrim(regexp_replace(btrim(v_customer.name), '^[^ ]+[ ]*', '')), '');
 IF v_last_name IS NULL THEN
 v_last_name := '-';
 END IF;
 v_device_token := COALESCE(NULLIF(btrim(_device_token), ''), 'kob-ios-' || v_customer.id::text);
 INSERT INTO public.registration_requests (first_name, last_name, phone, email, branch_id, device_token, preferred_language, user_agent, status, organization_id, requested_plan_id, created_at, updated_at)
 VALUES (v_first_name, v_last_name, v_phone, v_customer.email, v_branch.id, v_device_token,
 CASE WHEN lower(btrim(COALESCE(_preferred_language, 'en'))) = 'ar' THEN 'ar' ELSE 'en' END,
 'KOB iOS App', 'pending', v_branch.organization_id, v_plan.id, now(), now())
 RETURNING id INTO v_request_id;
 RETURN jsonb_build_object('success', true, 'already_pending', false, 'request_id', v_request_id, 'status', 'pending', 'plan_id', v_plan.id, 'branch_id', v_branch.id, 'organization_id', v_branch.organization_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_request_subscription(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_request_subscription(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_app_register(_first_name text, _last_name text, _email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_phone text;
 v_name text;
 v_email text;
 v_customer_id uuid;
BEGIN
 v_phone := public.customer_app_auth_phone();
 if v_phone is null then raise exception 'not_authenticated'; end if;
 IF v_phone !~ '^\+9665[0-9]{8}$' THEN
 RAISE EXCEPTION 'INVALID_PHONE';
 END IF;
 v_name := trim(coalesce(_first_name, '') || ' ' || coalesce(_last_name, ''));
 IF length(v_name) < 2 THEN
 RAISE EXCEPTION 'INVALID_NAME';
 END IF;
 v_email := lower(trim(coalesce(_email, '')));
 IF v_email = '' OR v_email NOT LIKE '%@%.%' THEN
 RAISE EXCEPTION 'INVALID_EMAIL';
 END IF;
 SELECT c.id INTO v_customer_id FROM public.customers c WHERE c.phone = v_phone ORDER BY c.created_at DESC LIMIT 1;
 IF v_customer_id IS NOT NULL THEN
 RETURN jsonb_build_object('success', false, 'customer_exists', true, 'customer_id', v_customer_id);
 END IF;
 INSERT INTO public.customers (name, phone, email, auth_user_id)
 VALUES (v_name, v_phone, v_email, auth.uid())
 RETURNING id INTO v_customer_id;
 RETURN jsonb_build_object('success', true, 'customer_exists', true, 'customer_id', v_customer_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_register(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_register(text, text, text) TO authenticated;

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
 SELECT id INTO _cid FROM public.customers WHERE auth_user_id = _uid ORDER BY created_at DESC LIMIT 1;
 IF _cid IS NULL AND _phone IS NOT NULL THEN
 SELECT id INTO _cid FROM public.customers
 WHERE auth_user_id IS NULL AND regexp_replace(phone, '^\+', '') = regexp_replace(_phone, '^\+', '')
 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF _cid IS NOT NULL THEN
 UPDATE public.customers SET auth_user_id = _uid WHERE id = _cid;
 END IF;
 END IF;
 RETURN jsonb_build_object('customer_exists', _cid IS NOT NULL, 'customer_id', _cid);
END;
$$;
REVOKE ALL ON FUNCTION public.customer_app_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_me() TO authenticated;