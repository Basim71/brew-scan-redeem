-- KOB Multi-tenant foundation — Phase 1
-- Non-destructive and idempotent.
-- Creates organization ownership, backfills all current data into one default
-- organization, and prepares tenant-aware keys without switching application
-- routes or replacing existing operational RLS policies yet.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core tenant tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  slug text not null,
  email text,
  phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_key unique (slug)
);

create table if not exists public.organization_settings (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  default_language text not null default 'ar'
    check (default_language in ('ar', 'en')),
  currency text not null default 'SAR',
  timezone text not null default 'Asia/Riyadh',
  logo_url text,
  background_url text,
  primary_color text,
  secondary_color text,
  customer_registration_enabled boolean not null default true,
  customer_comments_enabled boolean not null default true,
  one_drink_per_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'manager', 'cashier')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  branch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_org_user_key unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members(user_id);
create index if not exists organization_members_org_role_idx
  on public.organization_members(organization_id, role, status);
create index if not exists organizations_status_idx
  on public.organizations(status);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists organization_settings_set_updated_at on public.organization_settings;
create trigger organization_settings_set_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Create the default organization for all existing records.
-- The constant slug lets the migration remain idempotent.
-- ---------------------------------------------------------------------------
insert into public.organizations (
  name_ar,
  name_en,
  slug,
  owner_user_id
)
select
  'شركة KOB الحالية',
  'Current KOB Company',
  'kob-default',
  (
    select ur.user_id
    from public.user_roles ur
    where ur.role::text = 'admin'
    order by ur.created_at nulls last
    limit 1
  )
where not exists (
  select 1 from public.organizations where slug = 'kob-default'
);

insert into public.organization_settings (organization_id)
select id
from public.organizations
where slug = 'kob-default'
on conflict (organization_id) do nothing;

-- Copy existing staff roles into tenant memberships.
insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  branch_id
)
select
  o.id,
  ur.user_id,
  case ur.role::text
    when 'admin' then
      case when o.owner_user_id = ur.user_id then 'owner' else 'admin' end
    when 'cashier' then 'cashier'
    else 'manager'
  end,
  'active',
  p.branch_id
from public.organizations o
join public.user_roles ur on true
left join public.profiles p on p.id = ur.user_id
where o.slug = 'kob-default'
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    branch_id = excluded.branch_id,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Default organization helper used only for legacy inserts during migration.
-- New tenant-aware code must always send organization_id explicitly.
-- ---------------------------------------------------------------------------
create or replace function public.default_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.organizations
  where slug = 'kob-default'
  limit 1;
$$;

revoke all on function public.default_organization_id() from public;
grant execute on function public.default_organization_id() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Add and backfill organization_id on every operational table that exists.
-- This block also supports drink customization tables when already installed.
-- ---------------------------------------------------------------------------
do $$
declare
  table_name text;
  tenant_tables text[] := array[
    'branches',
    'plans',
    'coupons',
    'customers',
    'drink_types',
    'drink_option_groups',
    'drink_options',
    'subscriptions',
    'orders',
    'registration_requests',
    'customer_devices',
    'user_roles'
  ];
begin
  foreach table_name in array tenant_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'alter table public.%I add column if not exists organization_id uuid',
        table_name
      );

      execute format(
        'update public.%I set organization_id = public.default_organization_id() where organization_id is null',
        table_name
      );

      execute format(
        'alter table public.%I alter column organization_id set default public.default_organization_id()',
        table_name
      );

      execute format(
        'alter table public.%I alter column organization_id set not null',
        table_name
      );

      if not exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = table_name
          and c.conname = table_name || '_organization_id_fkey'
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (organization_id) references public.organizations(id) on delete cascade',
          table_name,
          table_name || '_organization_id_fkey'
        );
      end if;

      execute format(
        'create index if not exists %I on public.%I (organization_id)',
        table_name || '_organization_idx',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- organization_members.branch_id can only be constrained after branches exists.
do $$
begin
  if to_regclass('public.branches') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'organization_members_branch_id_fkey'
     ) then
    alter table public.organization_members
      add constraint organization_members_branch_id_fkey
      foreign key (branch_id) references public.branches(id) on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Replace global uniqueness with tenant-scoped uniqueness.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.customers') is not null then
    alter table public.customers drop constraint if exists customers_phone_key;
    create unique index if not exists customers_org_phone_key
      on public.customers(organization_id, phone);
  end if;

  if to_regclass('public.coupons') is not null then
    alter table public.coupons drop constraint if exists coupons_code_key;
    create unique index if not exists coupons_org_code_key
      on public.coupons(organization_id, code);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenant authorization helpers. Existing operational policies are intentionally
-- left untouched in this phase so the current UI continues to work. Phase 2
-- will switch every policy to these helpers after routes carry tenant context.
-- ---------------------------------------------------------------------------
create or replace function public.is_organization_member(
  requested_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = requested_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

create or replace function public.has_organization_role(
  requested_organization_id uuid,
  requested_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = requested_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(requested_roles)
      and o.status = 'active'
  );
$$;

create or replace function public.current_user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.status = 'active';
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.has_organization_role(uuid, text[]) from public;
revoke all on function public.current_user_organization_ids() from public;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;
grant execute on function public.has_organization_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.current_user_organization_ids() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS for the new tenant-control tables.
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "members can read their organizations" on public.organizations;
create policy "members can read their organizations"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

drop policy if exists "owners can update their organizations" on public.organizations;
create policy "owners can update their organizations"
on public.organizations
for update
to authenticated
using (public.has_organization_role(id, array['owner']))
with check (public.has_organization_role(id, array['owner']));

drop policy if exists "members can read organization settings" on public.organization_settings;
create policy "members can read organization settings"
on public.organization_settings
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "organization admins can manage settings" on public.organization_settings;
create policy "organization admins can manage settings"
on public.organization_settings
for all
to authenticated
using (public.has_organization_role(organization_id, array['owner','admin']))
with check (public.has_organization_role(organization_id, array['owner','admin']));

drop policy if exists "members can read organization members" on public.organization_members;
create policy "members can read organization members"
on public.organization_members
for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "organization admins can manage members" on public.organization_members;
create policy "organization admins can manage members"
on public.organization_members
for all
to authenticated
using (public.has_organization_role(organization_id, array['owner','admin']))
with check (public.has_organization_role(organization_id, array['owner','admin']));

-- Explicit grants for the new tables.
grant select on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organizations, public.organization_settings, public.organization_members to service_role;

-- ---------------------------------------------------------------------------
-- Verification view for administrators/service role.
-- ---------------------------------------------------------------------------
create or replace view public.tenant_backfill_status
with (security_invoker = true)
as
select 'branches'::text as table_name, count(*)::bigint as total_rows,
       count(*) filter (where organization_id is null)::bigint as missing_organization
from public.branches
union all
select 'plans', count(*), count(*) filter (where organization_id is null) from public.plans
union all
select 'coupons', count(*), count(*) filter (where organization_id is null) from public.coupons
union all
select 'customers', count(*), count(*) filter (where organization_id is null) from public.customers
union all
select 'drink_types', count(*), count(*) filter (where organization_id is null) from public.drink_types
union all
select 'subscriptions', count(*), count(*) filter (where organization_id is null) from public.subscriptions
union all
select 'orders', count(*), count(*) filter (where organization_id is null) from public.orders;

grant select on public.tenant_backfill_status to authenticated, service_role;

commit;
