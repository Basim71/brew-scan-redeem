# KOB Multi-Tenant — Phase 2

Implemented company-aware staff authentication.

## Login flow

1. Resolve company by company code (or exact company name) using `resolve_login_organization`.
2. Authenticate email/password with Supabase Auth.
3. Verify that the authenticated user has an active membership in that company using `verify_organization_login`.
4. Persist only the selected company identity in local storage.
5. Route company owners/admins/managers to `/admin` and cashiers to `/cashier`.
6. Reject and sign out users who authenticate successfully but do not belong to the entered company.

## Added

- `src/components/tenant/OrganizationProvider.tsx`
- Company-aware session and membership state.
- Company code field on `/auth`.
- Company-aware route guards.
- Company name in admin/cashier workspace.

## Security

- No company self-registration route was added.
- No service-role key is exposed to the browser.
- Company membership is verified after authentication through the database RPC.
