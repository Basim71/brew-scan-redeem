revoke all on function public.is_support_agent() from anon, public;
revoke all on function public.support_agent_level() from anon, public;
revoke all on function public.is_support_manager() from anon, public;
revoke all on function public.next_ticket_number() from anon, public;
grant execute on function public.is_support_agent() to authenticated, service_role;
grant execute on function public.support_agent_level() to authenticated, service_role;
grant execute on function public.is_support_manager() to authenticated, service_role;
grant execute on function public.next_ticket_number() to authenticated, service_role;

-- storage: support-attachments (path = <organization_id>/<ticket_id>/<file>)
create policy support_attachments_read on storage.objects for select to authenticated
using (
  bucket_id = 'support-attachments'
  and (
    public.is_support_agent()
    or public.is_organization_member(nullif((storage.foldername(name))[1], '')::uuid)
  )
);
create policy support_attachments_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'support-attachments'
  and (
    public.is_support_agent()
    or public.is_organization_member(nullif((storage.foldername(name))[1], '')::uuid)
  )
);
create policy support_attachments_delete on storage.objects for delete to authenticated
using (bucket_id = 'support-attachments' and owner = auth.uid());

-- storage: support-recordings
create policy support_recordings_read on storage.objects for select to authenticated
using (
  bucket_id = 'support-recordings'
  and (
    public.is_support_agent()
    or public.is_organization_member(nullif((storage.foldername(name))[1], '')::uuid)
  )
);
create policy support_recordings_insert on storage.objects for insert to authenticated
with check (bucket_id = 'support-recordings' and public.is_support_agent());