create or replace function public.delete_branch_safe(_branch_id uuid, _force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_subs integer;
  v_orders integer;
begin
  select organization_id into v_org from public.branches where id = _branch_id;
  if v_org is null then
    raise exception 'branch_not_found';
  end if;

  if not (public.has_organization_role(v_org, array['owner','admin']) or public.is_platform_user()) then
    raise exception 'not_authorized';
  end if;

  select count(*) into v_subs from public.subscriptions where branch_id = _branch_id;
  select count(*) into v_orders from public.orders where branch_id = _branch_id;

  if (v_subs > 0 or v_orders > 0) and not _force then
    raise exception 'branch_has_history:%:%', v_subs, v_orders;
  end if;

  update public.organization_settings set default_branch_id = null where default_branch_id = _branch_id;
  update public.organization_members set branch_id = null where branch_id = _branch_id;
  update public.profiles set branch_id = null where branch_id = _branch_id;
  update public.coupons set branch_id = null where branch_id = _branch_id;
  update public.tickets set branch_id = null where branch_id = _branch_id;

  if _force then
    delete from public.orders where branch_id = _branch_id;
    delete from public.subscriptions where branch_id = _branch_id;
  end if;

  delete from public.branches where id = _branch_id;

  return jsonb_build_object('deleted', true, 'subscriptions_removed', case when _force then v_subs else 0 end, 'orders_removed', case when _force then v_orders else 0 end);
end;
$$;

revoke all on function public.delete_branch_safe(uuid, boolean) from public, anon;
grant execute on function public.delete_branch_safe(uuid, boolean) to authenticated;