create or replace function public.default_organization_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.organization_id from public.organization_members m
       join public.organizations o on o.id = m.organization_id
      where m.user_id = auth.uid() and m.status = 'active' and o.slug <> 'kob-platform'
      order by m.created_at limit 1),
    (select id from public.organizations where slug = 'kob-default' limit 1));
$$;

create or replace function public.can_access_org(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_organization_member(_org) or public.is_platform_user();
$$;

create or replace function public.can_manage_org(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_organization_role(_org, array['owner','admin','manager'])
      or public.is_platform_user(array['platform_owner','platform_admin']::platform_role[]);
$$;

create or replace function public.inherit_org_from_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.branch_id is not null then
    select organization_id into new.organization_id from public.branches where id = new.branch_id;
  end if;
  return new;
end $$;

do $$
declare t text; p record;
begin
  foreach t in array array['orders','subscriptions','registration_requests','coupons','customer_devices'] loop
    execute format('drop trigger if exists trg_inherit_org on public.%I', t);
    execute format('create trigger trg_inherit_org before insert or update of branch_id on public.%I for each row execute function public.inherit_org_from_branch()', t);
  end loop;
  for p in select tablename, policyname from pg_policies where schemaname='public' and tablename in
    ('branches','coupons','customer_devices','customers','drink_option_groups','drink_options','drink_types','orders','plans','registration_requests','subscriptions')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "public read" on public.branches for select to anon using (true);
create policy "org read" on public.branches for select to authenticated using (public.can_access_org(organization_id));
create policy "org manage" on public.branches for all to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy "public read" on public.drink_types for select to anon using (is_active);
create policy "org read" on public.drink_types for select to authenticated using (public.can_access_org(organization_id));
create policy "org manage" on public.drink_types for all to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy "public read" on public.plans for select to anon using (is_active and not coalesce(is_hidden,false));
create policy "org read" on public.plans for select to authenticated using (public.can_access_org(organization_id));
create policy "org manage" on public.plans for all to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy "public read" on public.drink_option_groups for select to anon using (true);
create policy "org read" on public.drink_option_groups for select to authenticated using (public.can_access_org(organization_id));
create policy "org manage" on public.drink_option_groups for all to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy "public read" on public.drink_options for select to anon using (true);
create policy "org read" on public.drink_options for select to authenticated using (public.can_access_org(organization_id));
create policy "org manage" on public.drink_options for all to authenticated using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

do $$ declare t text; begin
  foreach t in array array['orders','subscriptions','registration_requests','coupons','customer_devices'] loop
    execute format($f$create policy "org read" on public.%I for select to authenticated using (
      public.can_manage_org(organization_id) or public.is_platform_user()
      or (public.is_organization_member(organization_id) and branch_id = public.current_user_branch()))$f$, t);
    execute format($f$create policy "org write" on public.%I for all to authenticated using (
      public.can_manage_org(organization_id)
      or (public.is_organization_member(organization_id) and branch_id = public.current_user_branch()))
      with check (public.can_manage_org(organization_id)
      or (public.is_organization_member(organization_id) and branch_id = public.current_user_branch()))$f$, t);
  end loop;
end $$;

create policy "org read" on public.customers for select to authenticated using (
  public.is_platform_user() or public.can_manage_org(organization_id)
  or exists (select 1 from public.subscriptions s where s.customer_id = customers.id
    and (public.can_manage_org(s.organization_id) or (public.is_organization_member(s.organization_id) and s.branch_id = public.current_user_branch())))
  or exists (select 1 from public.registration_requests r where r.phone = customers.phone and public.can_access_org(r.organization_id)));
create policy "org write" on public.customers for all to authenticated using (
  public.can_manage_org(organization_id)
  or exists (select 1 from public.subscriptions s where s.customer_id = customers.id and public.can_manage_org(s.organization_id)))
  with check (public.is_organization_member(organization_id) or public.is_platform_user());