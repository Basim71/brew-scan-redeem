-- ============ support_agents ============
create table public.support_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  member_id uuid references public.organization_members(id) on delete set null,
  display_name text,
  avatar_url text,
  agent_role text not null default 'agent' check (agent_role in ('agent','senior','manager')),
  status text not null default 'active' check (status in ('active','inactive')),
  max_concurrent_sessions integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.support_agents to authenticated;
grant all on public.support_agents to service_role;
alter table public.support_agents enable row level security;

-- ============ support_presence ============
create table public.support_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline' check (status in ('online','away','busy','offline')),
  current_ticket_id uuid,
  current_session_id uuid,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.support_presence to authenticated;
grant all on public.support_presence to service_role;
alter table public.support_presence enable row level security;
create policy support_presence_select on public.support_presence for select to authenticated using (true);
create policy support_presence_upsert on public.support_presence for insert to authenticated with check (user_id = auth.uid());
create policy support_presence_update on public.support_presence for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ helpers ============
create or replace function public.is_support_agent()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.support_agents sa
    where sa.user_id = auth.uid() and sa.status = 'active'
  ) or public.is_platform_user();
$$;

create or replace function public.support_agent_level()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select sa.agent_role from public.support_agents sa
      where sa.user_id = auth.uid() and sa.status = 'active' limit 1),
    case when public.is_platform_user(array['platform_owner','platform_admin']::platform_role[])
      then 'manager' when public.is_platform_user() then 'agent' else null end
  );
$$;

create or replace function public.is_support_manager()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.support_agent_level() = 'manager';
$$;

create policy support_agents_select on public.support_agents for select to authenticated using (true);
create policy support_agents_write on public.support_agents for all to authenticated
  using (public.is_support_manager()) with check (public.is_support_manager());

-- ============ tickets ============
create sequence public.ticket_number_seq;
create or replace function public.next_ticket_number()
returns text language sql set search_path = public, pg_temp as $$
  select 'KOB-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
$$;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default public.next_ticket_number(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_member_id uuid references public.organization_members(id) on delete set null,
  category text not null default 'technical' check (category in ('technical','subscription','payment','qr','pos','employee','feature_request','training','billing','branch_setup','other')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'new' check (status in ('new','waiting','accepted','assigned','waiting_company','scheduled','live','resolved','closed','cancelled','rejected')),
  subject text not null,
  description text not null default '',
  context jsonb not null default '{}'::jsonb,
  ai_summary text,
  ai_suggested_priority text,
  ai_suggested_category text,
  ai_duplicate_of uuid references public.tickets(id) on delete set null,
  assigned_agent_user_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  session_preference text not null default 'none' check (session_preference in ('none','chat','voice','scheduled','immediate')),
  scheduled_at timestamptz,
  allow_view boolean not null default true,
  allow_remote_control boolean not null default false,
  allow_voice boolean not null default false,
  allow_recording boolean not null default false,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  legacy_case_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_org_idx on public.tickets(organization_id, created_at desc);
create index tickets_status_idx on public.tickets(status);
grant select, insert, update on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;
create policy tickets_select on public.tickets for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_support_agent());
create policy tickets_insert on public.tickets for insert to authenticated
  with check (public.is_organization_member(organization_id) and created_by_user_id = auth.uid());
create policy tickets_update on public.tickets for update to authenticated
  using (public.is_organization_member(organization_id) or public.is_support_agent())
  with check (public.is_organization_member(organization_id) or public.is_support_agent());

create or replace function public.touch_support_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end; $$;
create trigger tickets_touch before update on public.tickets for each row execute function public.touch_support_updated_at();
create trigger support_agents_touch before update on public.support_agents for each row execute function public.touch_support_updated_at();

-- ============ ticket_messages ============
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  session_id uuid,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_kind text not null default 'company' check (sender_kind in ('company','agent','system','ai')),
  kind text not null default 'text' check (kind in ('text','code','image','file','system')),
  body text not null default '',
  language text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'shared' check (visibility in ('shared','internal')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at);
grant select, insert, update on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;
alter table public.ticket_messages enable row level security;
create policy ticket_messages_select on public.ticket_messages for select to authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (
    (public.is_organization_member(t.organization_id) and visibility = 'shared') or public.is_support_agent()))
);
create policy ticket_messages_insert on public.ticket_messages for insert to authenticated with check (
  sender_user_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and (
    (public.is_organization_member(t.organization_id) and visibility = 'shared') or public.is_support_agent()))
);
create policy ticket_messages_update on public.ticket_messages for update to authenticated
  using (sender_user_id = auth.uid()) with check (sender_user_id = auth.uid());

-- ============ ticket_files ============
create table public.ticket_files (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  message_id uuid references public.ticket_messages(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  bucket text not null default 'support-attachments',
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  kind text not null default 'document' check (kind in ('image','video','document','pdf','archive','log','recording','other')),
  created_at timestamptz not null default now()
);
create index ticket_files_ticket_idx on public.ticket_files(ticket_id, created_at);
grant select, insert, delete on public.ticket_files to authenticated;
grant all on public.ticket_files to service_role;
alter table public.ticket_files enable row level security;
create policy ticket_files_select on public.ticket_files for select to authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_organization_member(t.organization_id) or public.is_support_agent()))
);
create policy ticket_files_insert on public.ticket_files for insert to authenticated with check (
  uploaded_by = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_organization_member(t.organization_id) or public.is_support_agent()))
);
create policy ticket_files_delete on public.ticket_files for delete to authenticated using (uploaded_by = auth.uid());

-- ============ ticket_sessions ============
create table public.ticket_sessions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','approved','rejected','waiting','active','ended','expired','cancelled')),
  mode text not null default 'view' check (mode in ('view','control')),
  requested_at timestamptz not null default now(),
  approval_expires_at timestamptz,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  screen_share_active boolean not null default false,
  remote_control_active boolean not null default false,
  voice_active boolean not null default false,
  video_active boolean not null default false,
  recording_active boolean not null default false,
  current_path text,
  transferred_from_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ticket_sessions_ticket_idx on public.ticket_sessions(ticket_id, created_at desc);
grant select, insert, update on public.ticket_sessions to authenticated;
grant all on public.ticket_sessions to service_role;
alter table public.ticket_sessions enable row level security;
create policy ticket_sessions_select on public.ticket_sessions for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_support_agent());
create policy ticket_sessions_insert on public.ticket_sessions for insert to authenticated
  with check (public.is_support_agent() and agent_user_id = auth.uid());
create policy ticket_sessions_update on public.ticket_sessions for update to authenticated
  using (public.is_organization_member(organization_id) or public.is_support_agent())
  with check (public.is_organization_member(organization_id) or public.is_support_agent());
create trigger ticket_sessions_touch before update on public.ticket_sessions for each row execute function public.touch_support_updated_at();

-- ============ session_permissions ============
create table public.session_permissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ticket_sessions(id) on delete cascade,
  permission text not null check (permission in ('view_screen','voice','video','remote_control','recording','clipboard','annotation')),
  granted boolean not null default false,
  granted_by_user_id uuid references auth.users(id) on delete set null,
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, permission)
);
grant select, insert, update on public.session_permissions to authenticated;
grant all on public.session_permissions to service_role;
alter table public.session_permissions enable row level security;
create policy session_permissions_select on public.session_permissions for select to authenticated using (
  exists (select 1 from public.ticket_sessions s where s.id = session_id and (public.is_organization_member(s.organization_id) or public.is_support_agent()))
);
create policy session_permissions_insert on public.session_permissions for insert to authenticated with check (
  exists (select 1 from public.ticket_sessions s where s.id = session_id and (public.is_organization_member(s.organization_id) or public.is_support_agent()))
);
create policy session_permissions_update on public.session_permissions for update to authenticated using (
  exists (select 1 from public.ticket_sessions s where s.id = session_id and (public.is_organization_member(s.organization_id) or public.is_support_agent()))
) with check (
  exists (select 1 from public.ticket_sessions s where s.id = session_id and (public.is_organization_member(s.organization_id) or public.is_support_agent()))
);

-- ============ session_signals (WebRTC / input / cursor transport) ============
create table public.session_signals (
  id bigserial primary key,
  session_id uuid not null references public.ticket_sessions(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','ice','cursor','input','clipboard','annotation','control_request','control_grant','control_revoke','navigate','presence','ping')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index session_signals_session_idx on public.session_signals(session_id, id);
grant select, insert, delete on public.session_signals to authenticated;
grant all on public.session_signals to service_role;
alter table public.session_signals enable row level security;
create policy session_signals_select on public.session_signals for select to authenticated using (
  exists (select 1 from public.ticket_sessions s where s.id = session_id and (public.is_organization_member(s.organization_id) or public.is_support_agent()))
);
create policy session_signals_insert on public.session_signals for insert to authenticated with check (
  sender_user_id = auth.uid() and exists (select 1 from public.ticket_sessions s where s.id = session_id and (public.is_organization_member(s.organization_id) or public.is_support_agent()))
);
create policy session_signals_delete on public.session_signals for delete to authenticated using (sender_user_id = auth.uid());

-- ============ ticket_recordings ============
create table public.ticket_recordings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  session_id uuid references public.ticket_sessions(id) on delete set null,
  bucket text not null default 'support-recordings',
  path text,
  status text not null default 'recording' check (status in ('recording','processing','ready','failed')),
  duration_seconds integer,
  size_bytes bigint,
  includes_video boolean not null default true,
  includes_audio boolean not null default true,
  includes_chat boolean not null default true,
  includes_input boolean not null default false,
  timeline jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.ticket_recordings to authenticated;
grant all on public.ticket_recordings to service_role;
alter table public.ticket_recordings enable row level security;
create policy ticket_recordings_select on public.ticket_recordings for select to authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_organization_member(t.organization_id) or public.is_support_agent()))
);
create policy ticket_recordings_write on public.ticket_recordings for insert to authenticated with check (public.is_support_agent());
create policy ticket_recordings_update on public.ticket_recordings for update to authenticated using (public.is_support_agent()) with check (public.is_support_agent());

-- ============ ticket_events (timeline) ============
create table public.ticket_events (
  id bigserial primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  session_id uuid references public.ticket_sessions(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_kind text not null default 'system' check (actor_kind in ('company','agent','system','ai')),
  event_type text not null,
  from_status text,
  to_status text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ticket_events_ticket_idx on public.ticket_events(ticket_id, created_at);
grant select, insert on public.ticket_events to authenticated;
grant all on public.ticket_events to service_role;
alter table public.ticket_events enable row level security;
create policy ticket_events_select on public.ticket_events for select to authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_organization_member(t.organization_id) or public.is_support_agent()))
);
create policy ticket_events_insert on public.ticket_events for insert to authenticated with check (
  exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_organization_member(t.organization_id) or public.is_support_agent()))
);

create or replace function public.log_ticket_status_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (ticket_id, actor_user_id, actor_kind, event_type, to_status, message)
    values (new.id, auth.uid(), 'company', 'ticket_created', new.status, new.subject);
  elsif old.status is distinct from new.status then
    insert into public.ticket_events (ticket_id, actor_user_id, actor_kind, event_type, from_status, to_status)
    values (new.id, auth.uid(), 'system', 'status_changed', old.status, new.status);
  end if;
  if tg_op = 'UPDATE' and old.assigned_agent_user_id is distinct from new.assigned_agent_user_id then
    insert into public.ticket_events (ticket_id, actor_user_id, actor_kind, event_type, metadata)
    values (new.id, auth.uid(), 'agent', 'assigned', jsonb_build_object('agent_user_id', new.assigned_agent_user_id));
  end if;
  return new;
end; $$;
create trigger tickets_log_events after insert or update on public.tickets for each row execute function public.log_ticket_status_event();

-- ============ ticket_notes ============
create table public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  session_id uuid references public.ticket_sessions(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'agent' check (source in ('agent','ai')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ticket_notes to authenticated;
grant all on public.ticket_notes to service_role;
alter table public.ticket_notes enable row level security;
create policy ticket_notes_all on public.ticket_notes for all to authenticated
  using (public.is_support_agent()) with check (public.is_support_agent());
create trigger ticket_notes_touch before update on public.ticket_notes for each row execute function public.touch_support_updated_at();

-- ============ ticket_ratings ============
create table public.ticket_ratings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  resolved boolean not null default true,
  comment text,
  created_at timestamptz not null default now()
);
grant select, insert on public.ticket_ratings to authenticated;
grant all on public.ticket_ratings to service_role;
alter table public.ticket_ratings enable row level security;
create policy ticket_ratings_select on public.ticket_ratings for select to authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_id and (public.is_organization_member(t.organization_id) or public.is_support_agent()))
);
create policy ticket_ratings_insert on public.ticket_ratings for insert to authenticated with check (
  submitted_by_user_id = auth.uid() and exists (
    select 1 from public.tickets t where t.id = ticket_id
      and public.is_organization_member(t.organization_id) and t.status in ('resolved','closed'))
);

-- ============ kb_articles ============
create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default 'general',
  title_ar text not null,
  title_en text,
  excerpt_ar text,
  excerpt_en text,
  body_ar text not null default '',
  body_en text,
  tags text[] not null default '{}',
  video_url text,
  is_published boolean not null default true,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.kb_articles to authenticated;
grant insert, update, delete on public.kb_articles to authenticated;
grant all on public.kb_articles to service_role;
alter table public.kb_articles enable row level security;
create policy kb_articles_select on public.kb_articles for select to authenticated using (is_published or public.is_support_agent());
create policy kb_articles_write on public.kb_articles for all to authenticated
  using (public.is_support_manager()) with check (public.is_support_manager());
create trigger kb_articles_touch before update on public.kb_articles for each row execute function public.touch_support_updated_at();

-- ============ ai_suggestions ============
create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  session_id uuid references public.ticket_sessions(id) on delete set null,
  kind text not null check (kind in ('triage','duplicate','priority','category','summary','reply_company','reply_agent','session_action','session_summary','internal_note','kb_match')),
  audience text not null default 'agent' check (audience in ('agent','company')),
  content text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','sent')),
  provider text,
  model text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index ai_suggestions_ticket_idx on public.ai_suggestions(ticket_id, created_at desc);
grant select, insert, update on public.ai_suggestions to authenticated;
grant all on public.ai_suggestions to service_role;
alter table public.ai_suggestions enable row level security;
create policy ai_suggestions_select on public.ai_suggestions for select to authenticated using (
  public.is_support_agent() or (audience = 'company' and exists (
    select 1 from public.tickets t where t.id = ticket_id and public.is_organization_member(t.organization_id)))
);
create policy ai_suggestions_insert on public.ai_suggestions for insert to authenticated with check (
  public.is_support_agent() or (ticket_id is null) or exists (
    select 1 from public.tickets t where t.id = ticket_id and public.is_organization_member(t.organization_id))
);
create policy ai_suggestions_update on public.ai_suggestions for update to authenticated
  using (public.is_support_agent()) with check (public.is_support_agent());

-- ============ platform_ai_settings ============
create table public.platform_ai_settings (
  id text primary key default 'global',
  provider text not null default 'lovable' check (provider in ('lovable','latifa','openai','anthropic','gemini','ollama','custom')),
  model text not null default 'google/gemini-3.6-flash',
  base_url text,
  enabled boolean not null default true,
  temperature numeric not null default 0.3,
  require_human_approval boolean not null default true,
  options jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
grant select on public.platform_ai_settings to authenticated;
grant insert, update on public.platform_ai_settings to authenticated;
grant all on public.platform_ai_settings to service_role;
alter table public.platform_ai_settings enable row level security;
create policy platform_ai_settings_select on public.platform_ai_settings for select to authenticated using (true);
create policy platform_ai_settings_write on public.platform_ai_settings for all to authenticated
  using (public.is_platform_user(array['platform_owner','platform_admin']::platform_role[]))
  with check (public.is_platform_user(array['platform_owner','platform_admin']::platform_role[]));
insert into public.platform_ai_settings (id) values ('global') on conflict do nothing;

-- ============ realtime ============
alter table public.tickets replica identity full;
alter table public.ticket_messages replica identity full;
alter table public.ticket_events replica identity full;
alter table public.ticket_sessions replica identity full;
alter table public.session_permissions replica identity full;
alter table public.session_signals replica identity full;
alter table public.support_presence replica identity full;
alter table public.ai_suggestions replica identity full;
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.ticket_events;
alter publication supabase_realtime add table public.ticket_sessions;
alter publication supabase_realtime add table public.session_permissions;
alter publication supabase_realtime add table public.session_signals;
alter publication supabase_realtime add table public.support_presence;
alter publication supabase_realtime add table public.ai_suggestions;