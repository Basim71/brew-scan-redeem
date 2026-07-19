-- KOB Phase 3.1.1
-- Unify KOB platform staff and company staff under organizations + organization_members.
-- Safe to run after 20260719103000_platform_foundation.sql.

begin;

-- ---------------------------------------------------------------------------
-- Organization classification
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists organization_type text not null default 'company';

alter table public.organizations
  drop constraint if exists organizations_organization_type_check;

alter table public.organizations
  add constraint organizations_organization_type_check
  check (organization_type in ('platform', 'company'));

create unique index if not exists one_platform_organization_idx
  on public.organizations (organization_type)
  where organization_type = 'platform';

-- Keep the tenant-role model unified. Platform roles are valid only inside the
-- platform organization; company roles remain valid inside company organizations.
alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in (
    'owner', 'admin', 'manager', 'cashier',
    'platform_owner', 'platform_admin',
    'support_level_1', 'support_level_2', 'support_level_3'
  ));

-- Create the one internal KOB organization. This is not a customer tenant.
insert into public.organizations (
  name_ar, name_en, slug, organization_code, organization_type, status
)
values (
  'منصة KOB', 'KOB Platform', 'kob-platform', 'KOB-PLATFORM', 'platform', 'active'
)
on conflict (slug) do update
set organization_type = 'platform',
    organization_code = excluded.organization_code,
    status = 'active',
    updated_at = now();

insert into public.organization_settings (organization_id)
select id from public.organizations where organization_type = 'platform'
on conflict (organization_id) do nothing;

-- ---------------------------------------------------------------------------
-- Migrate any already-created platform_users into organization_members.
-- ---------------------------------------------------------------------------
do $$
declare
  platform_org_id uuid;
begin
  select id into platform_org_id
  from public.organizations
  where organization_type = 'platform'
  limit 1;

  if to_regclass('public.platform_users') is not null then
    insert into public.organization_members (
      organization_id, user_id, role, status
    )
    select
      platform_org_id,
      pu.auth_user_id,
      pu.role::text,
      case when pu.status = 'active' then 'active' else 'disabled' end
    from public.platform_users pu
    on conflict (organization_id, user_id) do update
    set role = excluded.role,
        status = excluded.status,
        updated_at = now();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Replace support ownership references with unified membership references.
-- ---------------------------------------------------------------------------
alter table public.support_requests
  add column if not exists assigned_platform_member_id uuid
  references public.organization_members(id) on delete set null;

alter table public.support_sessions
  add column if not exists platform_member_id uuid
  references public.organization_members(id) on delete restrict;

-- Backfill from the legacy table when it exists.
do $$
begin
  if to_regclass('public.platform_users') is not null then
    update public.support_requests sr
    set assigned_platform_member_id = om.id
    from public.platform_users pu
    join public.organization_members om on om.user_id = pu.auth_user_id
    join public.organizations o on o.id = om.organization_id and o.organization_type = 'platform'
    where sr.assigned_platform_user_id = pu.id
      and sr.assigned_platform_member_id is null;

    update public.support_sessions ss
    set platform_member_id = om.id
    from public.platform_users pu
    join public.organization_members om on om.user_id = pu.auth_user_id
    join public.organizations o on o.id = om.organization_id and o.organization_type = 'platform'
    where ss.platform_user_id = pu.id
      and ss.platform_member_id is null;
  end if;
end;
$$;

-- Existing sessions must have a migrated platform member before making it required.
do $$
begin
  if not exists (select 1 from public.support_sessions where platform_member_id is null) then
    alter table public.support_sessions alter column platform_member_id set not null;
  end if;
end;
$$;

create index if not exists support_requests_assigned_member_idx
  on public.support_requests (assigned_platform_member_id, status, created_at desc);
create index if not exists support_sessions_platform_member_idx
  on public.support_sessions (platform_member_id, status);

-- Remove old columns and table after data has been migrated.
alter table public.support_requests drop column if exists assigned_platform_user_id;
alter table public.support_sessions drop column if exists platform_user_id;
drop table if exists public.platform_users cascade;

-- ---------------------------------------------------------------------------
-- Unified authorization helpers
-- ---------------------------------------------------------------------------
create or replace function public.platform_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id
  from public.organizations
  where organization_type = 'platform' and status = 'active'
  limit 1;
$$;

create or replace function public.is_platform_user(required_roles public.platform_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = auth.uid()
      and om.status = 'active'
      and o.status = 'active'
      and o.organization_type = 'platform'
      and (
        required_roles is null
        or om.role = any(array(select r::text from unnest(required_roles) as r))
      )
  );
$$;

create or replace function public.get_my_platform_profile()
returns table (
  platform_member_id uuid,
  platform_organization_id uuid,
  full_name text,
  email text,
  platform_role text,
  user_status text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    om.id,
    om.organization_id,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      split_part(u.email, '@', 1)
    ) as full_name,
    u.email,
    om.role,
    om.status
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  join auth.users u on u.id = om.user_id
  left join public.profiles p on p.id = om.user_id
  where om.user_id = auth.uid()
    and om.status = 'active'
    and o.status = 'active'
    and o.organization_type = 'platform'
  limit 1;
$$;

-- A view for the Platform Users page without creating another source of truth.
create or replace view public.platform_staff
with (security_invoker = true)
as
select
  om.id,
  om.organization_id,
  om.user_id,
  coalesce(
    nullif(trim(p.full_name), ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(u.email, '@', 1)
  ) as full_name,
  u.email,
  om.role,
  om.status,
  u.last_sign_in_at as last_login_at,
  om.created_at,
  om.updated_at
from public.organization_members om
join public.organizations o on o.id = om.organization_id
join auth.users u on u.id = om.user_id
left join public.profiles p on p.id = om.user_id
where o.organization_type = 'platform';

revoke all on function public.platform_organization_id() from public;
revoke all on function public.is_platform_user(public.platform_role[]) from public;
revoke all on function public.get_my_platform_profile() from public;
grant execute on function public.platform_organization_id() to authenticated;
grant execute on function public.is_platform_user(public.platform_role[]) to authenticated;
grant execute on function public.get_my_platform_profile() to authenticated;
grant select on public.platform_staff to authenticated;

-- ---------------------------------------------------------------------------
-- RLS for organizations and memberships: platform staff can inspect the SaaS
-- catalog, while company members remain tenant-scoped.
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists organizations_platform_select on public.organizations;
create policy organizations_platform_select on public.organizations
for select to authenticated
using (public.is_platform_user());

drop policy if exists organization_members_platform_select on public.organization_members;
create policy organization_members_platform_select on public.organization_members
for select to authenticated
using (public.is_platform_user());

drop policy if exists organization_members_platform_manage on public.organization_members;
create policy organization_members_platform_manage on public.organization_members
for all to authenticated
using (public.is_platform_user(array['platform_owner','platform_admin']::public.platform_role[]))
with check (
  public.is_platform_user(array['platform_owner','platform_admin']::public.platform_role[])
  and organization_id = public.platform_organization_id()
  and role in (
    'platform_owner','platform_admin',
    'support_level_1','support_level_2','support_level_3'
  )
);

-- Recreate support policies against the unified helper signature.
drop policy if exists support_requests_platform_select on public.support_requests;
create policy support_requests_platform_select on public.support_requests
for select to authenticated using (public.is_platform_user());

drop policy if exists support_requests_platform_update on public.support_requests;
create policy support_requests_platform_update on public.support_requests
for update to authenticated using (public.is_platform_user()) with check (public.is_platform_user());

drop policy if exists support_sessions_platform_manage on public.support_sessions;
create policy support_sessions_platform_manage on public.support_sessions
for all to authenticated using (public.is_platform_user()) with check (public.is_platform_user());

drop policy if exists support_participants_platform_manage on public.support_session_participants;
create policy support_participants_platform_manage on public.support_session_participants
for all to authenticated using (public.is_platform_user()) with check (public.is_platform_user());

drop policy if exists support_activity_platform_insert on public.support_activity_log;
create policy support_activity_platform_insert on public.support_activity_log
for insert to authenticated with check (actor_user_id = auth.uid() and public.is_platform_user());

comment on column public.organizations.organization_type is
  'platform = internal KOB organization; company = customer tenant.';
comment on view public.platform_staff is
  'Read model derived from auth.users + organization_members; not a second source of truth.';

commit;
