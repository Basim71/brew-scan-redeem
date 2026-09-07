create table public.scan_promotions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  body_ar text,
  body_en text,
  image_url text,
  cta_label_ar text,
  cta_label_en text,
  cta_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.scan_promotions to authenticated;
grant all on public.scan_promotions to service_role;

alter table public.scan_promotions enable row level security;

create policy "members read promotions"
on public.scan_promotions for select to authenticated
using (public.is_organization_member(organization_id));

create policy "admins insert promotions"
on public.scan_promotions for insert to authenticated
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

create policy "admins update promotions"
on public.scan_promotions for update to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

create policy "admins delete promotions"
on public.scan_promotions for delete to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']));

create trigger scan_promotions_touch
before update on public.scan_promotions
for each row execute function public.set_updated_at();

create index scan_promotions_org_idx on public.scan_promotions(organization_id, is_active, sort_order);

create or replace function public.scan_promotions(_branch_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select coalesce(
      (select b.organization_id from public.branches b where b.id = _branch_id),
      (select o.id from public.organizations o order by o.created_at asc limit 1)
    ) as organization_id
  )
  select coalesce(jsonb_agg(row order by row_sort), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', p.id,
      'title_ar', p.title_ar,
      'title_en', p.title_en,
      'body_ar', p.body_ar,
      'body_en', p.body_en,
      'image_url', p.image_url,
      'cta_label_ar', p.cta_label_ar,
      'cta_label_en', p.cta_label_en,
      'cta_url', p.cta_url
    ) as row,
    p.sort_order as row_sort
    from public.scan_promotions p, target
    where p.organization_id = target.organization_id
      and p.is_active
      and (p.branch_id is null or p.branch_id = _branch_id)
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at >= now())
    order by p.sort_order asc, p.created_at desc
    limit 6
  ) s;
$$;

revoke all on function public.scan_promotions(uuid) from public;
grant execute on function public.scan_promotions(uuid) to anon, authenticated;