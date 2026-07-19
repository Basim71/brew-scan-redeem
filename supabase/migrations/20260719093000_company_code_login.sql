begin;

alter table public.organizations
  add column if not exists organization_code text;

update public.organizations
set organization_code = upper(regexp_replace(coalesce(nullif(slug, ''), left(id::text, 8)), '[^a-zA-Z0-9]', '', 'g'))
where organization_code is null or btrim(organization_code) = '';

do $$
begin
  if (select count(*) from public.organizations) = 1 then
    update public.organizations set organization_code = 'KOB001';
  end if;
end;
$$;

create or replace function public.normalize_organization_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.organization_code := upper(regexp_replace(btrim(new.organization_code), '[^A-Za-z0-9_-]', '', 'g'));
  if new.organization_code is null or length(new.organization_code) < 3 or length(new.organization_code) > 30 then
    raise exception 'Organization code must contain between 3 and 30 characters';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_organization_code_trigger on public.organizations;
create trigger normalize_organization_code_trigger
before insert or update of organization_code on public.organizations
for each row execute function public.normalize_organization_code();

create unique index if not exists organizations_code_unique_idx
  on public.organizations (lower(organization_code));

alter table public.organizations alter column organization_code set not null;

create or replace function public.resolve_login_organization(login_identifier text)
returns table (
  organization_id uuid,
  organization_code text,
  organization_name_ar text,
  organization_name_en text,
  organization_slug text,
  organization_status text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_identifier text := lower(btrim(login_identifier));
  matching_count integer;
begin
  if normalized_identifier is null or normalized_identifier = '' then
    raise exception 'Company code is required';
  end if;

  select count(*) into matching_count
  from public.organizations o
  where lower(o.organization_code) = normalized_identifier
     or lower(coalesce(o.name_ar, '')) = normalized_identifier
     or lower(coalesce(o.name_en, '')) = normalized_identifier;

  if matching_count = 0 then return; end if;
  if matching_count > 1 then
    raise exception 'More than one company has this name. Please use the company code.';
  end if;

  return query
  select o.id, o.organization_code, o.name_ar, o.name_en, o.slug, o.status
  from public.organizations o
  where lower(o.organization_code) = normalized_identifier
     or lower(coalesce(o.name_ar, '')) = normalized_identifier
     or lower(coalesce(o.name_en, '')) = normalized_identifier
  limit 1;
end;
$$;

revoke all on function public.resolve_login_organization(text) from public;
grant execute on function public.resolve_login_organization(text) to anon, authenticated;

create or replace function public.verify_organization_login(requested_organization_id uuid)
returns table (
  membership_id uuid,
  organization_id uuid,
  organization_code text,
  organization_name_ar text,
  organization_name_en text,
  organization_slug text,
  organization_status text,
  member_role text,
  member_status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select om.id, o.id, o.organization_code, o.name_ar, o.name_en, o.slug, o.status,
         om.role::text, om.status::text
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_id = auth.uid()
    and om.organization_id = requested_organization_id
  limit 1;
$$;

revoke all on function public.verify_organization_login(uuid) from public;
grant execute on function public.verify_organization_login(uuid) to authenticated;

commit;
