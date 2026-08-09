create or replace function public.scan_branding(_branch_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organization_name_ar', o.name_ar,
    'organization_name_en', o.name_en,
    'logo_url', coalesce(b.logo_url, o.logo_url)
  )
  from public.branches b
  join public.organizations o on o.id = b.organization_id
  where b.id = _branch_id
$$;

revoke all on function public.scan_branding(uuid) from public;
grant execute on function public.scan_branding(uuid) to anon, authenticated;