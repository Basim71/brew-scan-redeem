-- Run this only AFTER creating the user in Supabase Authentication > Users.
-- Change the email below to the exact email of the KOB platform owner.

do $$
declare
  owner_email text := 'owner@kob.sa'; -- CHANGE THIS
  owner_user_id uuid;
  platform_org_id uuid;
begin
  select id into owner_user_id
  from auth.users
  where lower(email) = lower(owner_email)
  limit 1;

  if owner_user_id is null then
    raise exception 'No Supabase Auth user found for email: %', owner_email;
  end if;

  select id into platform_org_id
  from public.organizations
  where organization_type = 'platform'
  limit 1;

  if platform_org_id is null then
    raise exception 'KOB platform organization was not found. Run migration 20260719110000 first.';
  end if;

  insert into public.organization_members (
    organization_id, user_id, role, status
  )
  values (
    platform_org_id, owner_user_id, 'platform_owner', 'active'
  )
  on conflict (organization_id, user_id) do update
  set role = 'platform_owner',
      status = 'active',
      updated_at = now();
end;
$$;

-- Verification
select
  o.name_en,
  o.organization_code,
  om.role,
  om.status,
  u.email
from public.organization_members om
join public.organizations o on o.id = om.organization_id
join auth.users u on u.id = om.user_id
where o.organization_type = 'platform';
