-- 1) Make owner@kob.sa a full platform owner
update public.organization_members om
set role = 'platform_owner', status = 'active', updated_at = now()
where om.user_id = 'ffc82d09-9cdc-48ad-9835-fd2adb60bf01'
  and om.organization_id = public.platform_organization_id();

-- 2) Remove his company-portal membership (platform staff must not hold company roles)
delete from public.organization_members om
using public.organizations o
where o.id = om.organization_id
  and om.user_id = 'ffc82d09-9cdc-48ad-9835-fd2adb60bf01'
  and o.organization_type = 'company';

-- 3) Platform profile lookup used by the platform portal
create or replace function public.get_my_platform_profile()
returns table (
  platform_member_id uuid,
  full_name text,
  email text,
  platform_role platform_role,
  user_status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select om.id,
         coalesce(p.full_name, ''),
         coalesce(p.email, u.email),
         om.role::platform_role,
         om.status
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  left join public.profiles p on p.id = om.user_id
  left join auth.users u on u.id = om.user_id
  where om.user_id = auth.uid()
    and om.status = 'active'
    and o.status = 'active'
    and o.organization_type = 'platform'
  limit 1;
$$;

revoke all on function public.get_my_platform_profile() from public, anon;
grant execute on function public.get_my_platform_profile() to authenticated;