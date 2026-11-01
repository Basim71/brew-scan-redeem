CREATE OR REPLACE FUNCTION public.current_user_branch()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select coalesce(
    (select branch_id from public.user_roles where user_id = auth.uid() and branch_id is not null limit 1),
    (select m.branch_id from public.organization_members m where m.user_id = auth.uid() and m.status='active' and m.branch_id is not null order by m.created_at limit 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
  or exists (
    select 1 from public.organization_members m
    where m.user_id = _user_id and m.status = 'active'
      and ((_role = 'cashier' and m.role = 'cashier')
        or (_role = 'admin' and m.role in ('owner','admin','manager')))
  );
$$;