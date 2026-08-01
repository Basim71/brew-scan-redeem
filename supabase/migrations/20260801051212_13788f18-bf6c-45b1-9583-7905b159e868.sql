alter table public.organization_settings
  add column if not exists address text,
  add column if not exists sales_channel_customer_app boolean not null default true,
  add column if not exists sales_channel_cashier boolean not null default true,
  add column if not exists sales_channel_website boolean not null default false,
  add column if not exists sales_channel_external_api boolean not null default false,
  add column if not exists payment_methods text[] not null default array['cash','card','mada']::text[],
  add column if not exists default_payment_method text not null default 'cash',
  add column if not exists tax_enabled boolean not null default false,
  add column if not exists tax_percentage numeric(5,2) not null default 15,
  add column if not exists tax_included boolean not null default true,
  add column if not exists default_activation text not null default 'immediate',
  add column if not exists auto_renewal boolean not null default false,
  add column if not exists default_bonus_days integer not null default 0,
  add column if not exists order_prep_minutes integer not null default 5,
  add column if not exists order_number_format text not null default 'sequential',
  add column if not exists queue_behavior text not null default 'fifo',
  add column if not exists allow_multiple_active_orders boolean not null default false,
  add column if not exists welcome_message_ar text,
  add column if not exists welcome_message_en text,
  add column if not exists order_completed_message_ar text,
  add column if not exists order_completed_message_en text,
  add column if not exists loyalty_message_ar text,
  add column if not exists loyalty_message_en text,
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_sms boolean not null default false,
  add column if not exists notify_push boolean not null default false,
  add column if not exists notify_orders boolean not null default true,
  add column if not exists notify_subscription_expiry boolean not null default true,
  add column if not exists notify_low_stock boolean not null default false,
  add column if not exists notify_training boolean not null default false,
  add column if not exists session_timeout_minutes integer not null default 480,
  add column if not exists password_policy text not null default 'standard',
  add column if not exists two_factor_required boolean not null default false,
  add column if not exists login_restriction text not null default 'none',
  add column if not exists allowed_ip_addresses text[] not null default '{}'::text[],
  add column if not exists audit_log_enabled boolean not null default true,
  add column if not exists default_employee_role text not null default 'cashier',
  add column if not exists employee_invite_mode text not null default 'admin_only',
  add column if not exists password_reset_policy text not null default 'self_service',
  add column if not exists default_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists branch_qr_mode text not null default 'per_branch',
  add column if not exists integrations jsonb not null default '{}'::jsonb;

create or replace function public.validate_organization_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.default_language not in ('ar','en') then raise exception 'settings_invalid_language'; end if;
  if new.currency !~ '^[A-Za-z]{3}$' then raise exception 'settings_invalid_currency'; end if;
  if new.tax_percentage < 0 or new.tax_percentage > 100 then raise exception 'settings_invalid_tax'; end if;
  if new.default_activation not in ('immediate','manual','scheduled') then raise exception 'settings_invalid_activation'; end if;
  if new.default_bonus_days < 0 or new.default_bonus_days > 365 then raise exception 'settings_invalid_bonus_days'; end if;
  if new.order_prep_minutes < 0 or new.order_prep_minutes > 240 then raise exception 'settings_invalid_prep_time'; end if;
  if new.order_number_format not in ('sequential','daily','branch_prefixed') then raise exception 'settings_invalid_order_format'; end if;
  if new.queue_behavior not in ('fifo','priority','manual') then raise exception 'settings_invalid_queue'; end if;
  if new.session_timeout_minutes < 15 or new.session_timeout_minutes > 10080 then raise exception 'settings_invalid_session_timeout'; end if;
  if new.password_policy not in ('standard','strong','strict') then raise exception 'settings_invalid_password_policy'; end if;
  if new.login_restriction not in ('none','ip_allowlist','business_hours') then raise exception 'settings_invalid_login_restriction'; end if;
  if new.password_reset_policy not in ('self_service','admin_only') then raise exception 'settings_invalid_password_reset_policy'; end if;
  if new.employee_invite_mode not in ('admin_only','managers_allowed','disabled') then raise exception 'settings_invalid_invite_mode'; end if;
  if new.branch_qr_mode not in ('per_branch','single') then raise exception 'settings_invalid_qr_mode'; end if;
  if array_length(new.payment_methods, 1) is null then raise exception 'settings_no_payment_method'; end if;
  if not (new.payment_methods <@ array['cash','card','apple_pay','stc_pay','mada','bank_transfer']::text[]) then
    raise exception 'settings_invalid_payment_method';
  end if;
  if not (new.default_payment_method = any(new.payment_methods)) then raise exception 'settings_default_payment_not_enabled'; end if;
  if new.default_branch_id is not null and not exists (
    select 1 from public.branches b where b.id = new.default_branch_id and b.organization_id = new.organization_id
  ) then raise exception 'settings_invalid_default_branch'; end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_organization_settings on public.organization_settings;
create trigger validate_organization_settings
before insert or update on public.organization_settings
for each row execute function public.validate_organization_settings();

create table if not exists public.organization_settings_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  section text not null,
  field text not null,
  old_value text,
  new_value text,
  created_at timestamp with time zone not null default now()
);

grant select, insert on public.organization_settings_audit to authenticated;
grant all on public.organization_settings_audit to service_role;

alter table public.organization_settings_audit enable row level security;

drop policy if exists "members read settings audit" on public.organization_settings_audit;
create policy "members read settings audit" on public.organization_settings_audit
for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists "admins write settings audit" on public.organization_settings_audit;
create policy "admins write settings audit" on public.organization_settings_audit
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin']) and actor_user_id = auth.uid()
);

create index if not exists organization_settings_audit_org_created_idx
  on public.organization_settings_audit (organization_id, created_at desc);

drop policy if exists "owners can update their organizations" on public.organizations;
create policy "owners and admins can update their organizations" on public.organizations
for update to authenticated
using (public.has_organization_role(id, array['owner','admin']))
with check (public.has_organization_role(id, array['owner','admin']));