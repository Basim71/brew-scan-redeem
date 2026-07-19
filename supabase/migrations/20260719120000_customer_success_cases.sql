-- KOB Phase 3.2 — Customer Success cases and workflow
begin;

create sequence if not exists public.customer_success_case_number_seq start 1000;

create or replace function public.next_customer_success_case_number()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select 'CS-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.customer_success_case_number_seq')::text, 6, '0');
$$;

create table if not exists public.customer_success_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default public.next_customer_success_case_number(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_member_id uuid not null references public.organization_members(id) on delete restrict,
  assigned_platform_member_id uuid references public.organization_members(id) on delete set null,
  category text not null check (category in ('technical','training','feature_request','billing','branch_setup','pos_integration','other')),
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  status text not null default 'new' check (status in ('new','triaged','assigned','waiting_company','waiting_platform','scheduled','active','resolved','closed','cancelled')),
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 3 and 10000),
  session_preference text not null default 'none' check (session_preference in ('none','chat','voice','scheduled','immediate')),
  scheduled_at timestamptz,
  allow_view boolean not null default true,
  allow_temporary_edit boolean not null default false,
  allow_voice boolean not null default false,
  allow_recording boolean not null default false,
  requested_at timestamptz not null default now(),
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_success_scheduled_time_check check (session_preference <> 'scheduled' or scheduled_at is not null)
);

create table if not exists public.customer_success_case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.customer_success_cases(id) on delete cascade,
  sender_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 10000),
  visibility text not null default 'shared' check (visibility in ('shared','internal')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.customer_success_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.customer_success_cases(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_success_feedback (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.customer_success_cases(id) on delete cascade,
  submitted_by_member_id uuid not null references public.organization_members(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  resolved boolean not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists customer_success_cases_org_status_idx on public.customer_success_cases(organization_id,status,requested_at desc);
create index if not exists customer_success_cases_platform_queue_idx on public.customer_success_cases(status,priority,requested_at);
create index if not exists customer_success_cases_assignee_idx on public.customer_success_cases(assigned_platform_member_id,status);
create index if not exists customer_success_messages_case_idx on public.customer_success_case_messages(case_id,created_at);
create index if not exists customer_success_events_case_idx on public.customer_success_case_events(case_id,created_at);

create or replace function public.set_customer_success_updated_at()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists customer_success_cases_updated_at on public.customer_success_cases;
create trigger customer_success_cases_updated_at before update on public.customer_success_cases
for each row execute function public.set_customer_success_updated_at();

create or replace function public.log_customer_success_case_event()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    insert into public.customer_success_case_events(case_id,actor_user_id,event_type,to_status,metadata)
    values(new.id,auth.uid(),'case_created',new.status,jsonb_build_object('priority',new.priority,'category',new.category));
  elsif old.status is distinct from new.status then
    insert into public.customer_success_case_events(case_id,actor_user_id,event_type,from_status,to_status)
    values(new.id,auth.uid(),'status_changed',old.status,new.status);
  end if;
  return new;
end $$;

drop trigger if exists customer_success_case_event_trigger on public.customer_success_cases;
create trigger customer_success_case_event_trigger after insert or update on public.customer_success_cases
for each row execute function public.log_customer_success_case_event();

alter table public.customer_success_cases enable row level security;
alter table public.customer_success_case_messages enable row level security;
alter table public.customer_success_case_events enable row level security;
alter table public.customer_success_feedback enable row level security;

-- Company members can see their own organization's cases.
drop policy if exists customer_success_cases_company_select on public.customer_success_cases;
create policy customer_success_cases_company_select on public.customer_success_cases
for select to authenticated using (
  public.is_platform_user()
  or exists (
    select 1 from public.organization_members om
    where om.id=created_by_member_id or (om.organization_id=customer_success_cases.organization_id and om.user_id=auth.uid() and om.status='active')
  )
);

-- Only company owner/admin/manager can create a case, and membership must belong to the tenant.
drop policy if exists customer_success_cases_company_insert on public.customer_success_cases;
create policy customer_success_cases_company_insert on public.customer_success_cases
for insert to authenticated with check (
  exists (
    select 1 from public.organization_members om
    join public.organizations o on o.id=om.organization_id
    where om.id=created_by_member_id
      and om.user_id=auth.uid()
      and om.organization_id=customer_success_cases.organization_id
      and om.status='active'
      and om.role in ('owner','admin','manager')
      and o.organization_type='company'
      and o.status='active'
  )
);

-- Platform staff manage workflow. Company users may only update permissions while case is not closed.
drop policy if exists customer_success_cases_platform_update on public.customer_success_cases;
create policy customer_success_cases_platform_update on public.customer_success_cases
for update to authenticated using (public.is_platform_user()) with check (public.is_platform_user());

drop policy if exists customer_success_messages_select on public.customer_success_case_messages;
create policy customer_success_messages_select on public.customer_success_case_messages
for select to authenticated using (
  exists (
    select 1 from public.customer_success_cases c
    where c.id=case_id and (
      public.is_platform_user()
      or (
        visibility='shared'
        and exists (select 1 from public.organization_members om where om.organization_id=c.organization_id and om.user_id=auth.uid() and om.status='active')
      )
    )
  )
);

drop policy if exists customer_success_messages_insert on public.customer_success_case_messages;
create policy customer_success_messages_insert on public.customer_success_case_messages
for insert to authenticated with check (
  sender_user_id=auth.uid()
  and exists (
    select 1 from public.customer_success_cases c
    where c.id=case_id and (
      public.is_platform_user()
      or (
        visibility='shared'
        and exists (select 1 from public.organization_members om where om.organization_id=c.organization_id and om.user_id=auth.uid() and om.status='active')
      )
    )
  )
);

drop policy if exists customer_success_events_select on public.customer_success_case_events;
create policy customer_success_events_select on public.customer_success_case_events
for select to authenticated using (
  exists (
    select 1 from public.customer_success_cases c
    where c.id=case_id and (
      public.is_platform_user()
      or exists (select 1 from public.organization_members om where om.organization_id=c.organization_id and om.user_id=auth.uid() and om.status='active')
    )
  )
);

drop policy if exists customer_success_feedback_select on public.customer_success_feedback;
create policy customer_success_feedback_select on public.customer_success_feedback
for select to authenticated using (
  public.is_platform_user()
  or exists (
    select 1 from public.customer_success_cases c
    join public.organization_members om on om.organization_id=c.organization_id
    where c.id=case_id and om.user_id=auth.uid() and om.status='active'
  )
);

drop policy if exists customer_success_feedback_insert on public.customer_success_feedback;
create policy customer_success_feedback_insert on public.customer_success_feedback
for insert to authenticated with check (
  exists (
    select 1 from public.customer_success_cases c
    join public.organization_members om on om.organization_id=c.organization_id
    where c.id=case_id and om.id=submitted_by_member_id and om.user_id=auth.uid() and om.status='active' and c.status in ('resolved','closed')
  )
);

grant select,insert on public.customer_success_cases to authenticated;
grant update on public.customer_success_cases to authenticated;
grant select,insert on public.customer_success_case_messages to authenticated;
grant select on public.customer_success_case_events to authenticated;
grant select,insert on public.customer_success_feedback to authenticated;
grant usage,select on sequence public.customer_success_case_number_seq to authenticated;

alter publication supabase_realtime add table public.customer_success_cases;
alter publication supabase_realtime add table public.customer_success_case_messages;

commit;
