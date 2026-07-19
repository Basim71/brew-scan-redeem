# KOB Phase 3.1 — Platform Foundation

## Added
- Separate `/platform-auth` login for KOB platform staff.
- Platform access context and role gate.
- `/platform` central dashboard.
- `/platform/companies` organization directory.
- `/platform/support` real-time Customer Success inbox.
- `/platform/users` platform staff directory.
- `/platform/settings` foundation page.
- Platform roles: owner, admin, support L1/L2/L3.
- Support request/session/message/audit database foundation.
- RLS separating company managers from platform staff.

## Important security rule
A platform support employee must not receive company tenant access merely because they are a platform user. Future tenant actions must be executed through an approved, active support session context and audited.

## Setup
1. Apply migrations in order, including `20260719103000_platform_foundation.sql`.
2. Create the first platform Auth user in Supabase Auth.
3. Insert its user ID into `platform_users` as `platform_owner` (use the Supabase SQL editor/service backend).
4. Visit `/platform-auth`.

Example bootstrap (replace values):

```sql
insert into public.platform_users (auth_user_id, full_name, email, role)
values ('AUTH-USER-UUID', 'KOB Owner', 'owner@example.com', 'platform_owner');
```

No self-registration or service-role key is exposed in the frontend.
