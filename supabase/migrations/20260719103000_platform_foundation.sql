-- KOB Phase 3.1: Platform administration and support foundation

create type public.platform_role as enum (
  'platform_owner',
  'platform_admin',
  'support_level_1',
  'support_level_2',
  'support_level_3'
);

create type public.support_request_type as enum ('support', 'training');
create type public.support_priority as enum ('normal', 'high', 'urgent');
create type public.support_request_status as enum (
  'pending', 'accepted', 'declined', 'reschedule_proposed',
  'scheduled', 'active', 'completed', 'cancelled', 'expired'
);
create type public.support_session_mode as enum ('view', 'assist', 'edit');
create type public.support_session_status as enum ('waiting', 'active', 'completed', 'cancelled', 'expired');

create table public.platform_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.platform_role not null default 'support_level_1',
  status text not null default 'active' check (status in ('active', 'suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  assigned_platform_user_id uuid references public.platform_users(id) on delete set null,
  type public.support_request_type not null,
  priority public.support_priority not null default 'normal',
  status public.support_request_status not null default 'pending',
  requested_start_at timestamptz,
  scheduled_at timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes between 10 and 480),
  requested_mode public.support_session_mode not null default 'view',
  allow_voice boolean not null default true,
  allow_recording boolean not null default false,
  subject text not null,
  description text,
  reschedule_note text,
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.support_requests(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform_user_id uuid not null references public.platform_users(id) on delete restrict,
  approved_by_company_user_id uuid not null references auth.users(id) on delete restrict,
  status public.support_session_status not null default 'waiting',
  mode public.support_session_mode not null default 'view',
  voice_enabled boolean not null default false,
  recording_enabled boolean not null default false,
  approval_expires_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  current_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.support_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_type text not null check (participant_type in ('platform', 'company')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (session_id, user_id)
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.support_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  message text not null check (char_length(message) between 1 and 5000),
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.support_activity_log (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.support_sessions(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index support_requests_org_status_idx on public.support_requests (organization_id, status, created_at desc);
create index support_requests_assigned_idx on public.support_requests (assigned_platform_user_id, status, created_at desc);
create index support_sessions_org_status_idx on public.support_sessions (organization_id, status);
create index support_messages_session_created_idx on public.support_messages (session_id, created_at);
create index support_activity_session_created_idx on public.support_activity_log (session_id, created_at);

create or replace function public.is_platform_user(required_roles public.platform_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_users pu
    where pu.auth_user_id = auth.uid()
      and pu.status = 'active'
      and (required_roles is null or pu.role = any(required_roles))
  );
$$;

create or replace function public.can_manage_support_for_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'manager')
  );
$$;

create or replace function public.get_my_platform_profile()
returns table (
  platform_user_id uuid,
  full_name text,
  email text,
  platform_role public.platform_role,
  user_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select pu.id, pu.full_name, pu.email, pu.role, pu.status
  from public.platform_users pu
  where pu.auth_user_id = auth.uid() and pu.status = 'active'
  limit 1;
$$;

revoke all on function public.is_platform_user(public.platform_role[]) from public;
revoke all on function public.can_manage_support_for_organization(uuid) from public;
grant execute on function public.is_platform_user(public.platform_role[]) to authenticated;
grant execute on function public.can_manage_support_for_organization(uuid) to authenticated;
grant execute on function public.get_my_platform_profile() to authenticated;

alter table public.platform_users enable row level security;
alter table public.support_requests enable row level security;
alter table public.support_sessions enable row level security;
alter table public.support_session_participants enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_activity_log enable row level security;

create policy platform_users_self_or_admin_select on public.platform_users
for select to authenticated
using (auth_user_id = auth.uid() or public.is_platform_user(array['platform_owner','platform_admin']::public.platform_role[]));

create policy platform_users_admin_manage on public.platform_users
for all to authenticated
using (public.is_platform_user(array['platform_owner','platform_admin']::public.platform_role[]))
with check (public.is_platform_user(array['platform_owner','platform_admin']::public.platform_role[]));

create policy support_requests_platform_select on public.support_requests
for select to authenticated using (public.is_platform_user());
create policy support_requests_company_select on public.support_requests
for select to authenticated using (public.can_manage_support_for_organization(organization_id));
create policy support_requests_company_insert on public.support_requests
for insert to authenticated with check (
  requested_by = auth.uid() and public.can_manage_support_for_organization(organization_id)
);
create policy support_requests_platform_update on public.support_requests
for update to authenticated using (public.is_platform_user()) with check (public.is_platform_user());
create policy support_requests_company_update on public.support_requests
for update to authenticated using (public.can_manage_support_for_organization(organization_id))
with check (public.can_manage_support_for_organization(organization_id));

create policy support_sessions_parties_select on public.support_sessions
for select to authenticated using (
  public.is_platform_user() or public.can_manage_support_for_organization(organization_id)
);
create policy support_sessions_platform_manage on public.support_sessions
for all to authenticated using (public.is_platform_user()) with check (public.is_platform_user());
create policy support_sessions_company_update on public.support_sessions
for update to authenticated using (public.can_manage_support_for_organization(organization_id))
with check (public.can_manage_support_for_organization(organization_id));

create policy support_participants_parties on public.support_session_participants
for select to authenticated using (
  exists (select 1 from public.support_sessions s where s.id = session_id and (public.is_platform_user() or public.can_manage_support_for_organization(s.organization_id)))
);
create policy support_participants_platform_manage on public.support_session_participants
for all to authenticated using (public.is_platform_user()) with check (public.is_platform_user());

create policy support_messages_parties_select on public.support_messages
for select to authenticated using (
  exists (select 1 from public.support_sessions s where s.id = session_id and (public.is_platform_user() or public.can_manage_support_for_organization(s.organization_id)))
);
create policy support_messages_parties_insert on public.support_messages
for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.support_sessions s where s.id = session_id
      and s.status = 'active'
      and (public.is_platform_user() or public.can_manage_support_for_organization(s.organization_id))
  )
);

create policy support_activity_parties_select on public.support_activity_log
for select to authenticated using (
  exists (select 1 from public.support_sessions s where s.id = session_id and (public.is_platform_user() or public.can_manage_support_for_organization(s.organization_id)))
);
create policy support_activity_platform_insert on public.support_activity_log
for insert to authenticated with check (actor_user_id = auth.uid() and public.is_platform_user());

alter publication supabase_realtime add table public.support_requests;
alter publication supabase_realtime add table public.support_sessions;
alter publication supabase_realtime add table public.support_messages;

comment on table public.support_sessions is 'Approved support context. Platform staff must not access company data outside an active approved session.';
