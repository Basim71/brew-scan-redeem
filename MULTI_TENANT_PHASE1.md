# KOB Multi-Tenant — Phase 1

This phase adds the database foundation for multiple isolated companies without deleting existing data or changing the current application routes.

## Added

- `organizations`
- `organization_settings`
- `organization_members`
- Tenant helper functions for membership and role checks
- `organization_id` on all current operational tables
- A default organization (`kob-default`) containing all existing records
- Tenant-scoped uniqueness for customer phone numbers and coupon codes
- RLS on the three new tenant-control tables
- `tenant_backfill_status` verification view

## Compatibility

Existing operational RLS policies are not replaced in this phase. This is intentional: the current UI does not yet carry organization context. The migration assigns a legacy default organization automatically so existing inserts continue to work.

Phase 2 must update authentication, routes, queries, and then replace each operational policy with tenant-aware policies.

## Apply

Run the migration through Supabase CLI:

```bash
supabase db push
```

Or copy the complete contents of:

```text
supabase/migrations/20260719090000_multi_tenant_foundation.sql
```

into Supabase SQL Editor and run it once.

## Verify

```sql
select * from public.organizations;
select * from public.organization_members;
select * from public.organization_settings;
select * from public.tenant_backfill_status;
```

Every row in `tenant_backfill_status.missing_organization` must be `0`.
