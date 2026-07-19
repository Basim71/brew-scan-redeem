# KOB Phase 3.1.1 — Unified Platform Organization

## Architectural change

KOB Platform is now an internal organization (`organization_type = 'platform'`).
Platform staff and company staff use the same source of truth:

- `auth.users`
- `organizations`
- `organization_members`

The legacy `platform_users` table is migrated and removed.

## Apply

1. Run all migrations through `20260719110000_unified_platform_organization.sql`.
2. Create the platform owner in Supabase Authentication.
3. Edit and run `KOB_PLATFORM_OWNER_SETUP.sql` using the owner's real email.
4. Sign in at `/platform-auth`.

## Platform roles

- `platform_owner`
- `platform_admin`
- `support_level_1`
- `support_level_2`
- `support_level_3`

## Customer company roles

- `owner`
- `admin`
- `manager`
- `cashier`
