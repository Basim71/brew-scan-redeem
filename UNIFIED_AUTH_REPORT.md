# UNIFIED_AUTH_REPORT

## Authentication flow
1. User lands on `/auth`. If a Supabase session already exists, a full-screen loading state runs while active memberships are fetched and the user is routed silently.
2. Otherwise the unified premium form is shown (email + password, show/hide, language switcher).
3. On submit: `supabase.auth.signInWithPassword` → on success, fetch active memberships joined with organizations.
4. Destination is decided from `organization_type` + `role` — the user never picks "platform vs company".
5. Single active membership → auto-select and redirect. Multiple → workspace selector. Zero → sign out + "no active workspace" message.

## Membership resolution
`fetchActiveMemberships(userId)` (in `src/features/authentication/services/authentication.service.ts`) queries `organization_members` joined with `organizations!inner`, selecting `organization_type` alongside the other fields. Rows are filtered to `status = 'active'` on both membership and organization. Invalid `organization_type` values are dropped. RLS on both tables continues to enforce access.

## Redirect rules
- `organization_type = platform` → `/platform`.
- `organization_type = company` and role in `owner|admin|manager` → `/admin`.
- `organization_type = company` and role `cashier` → `/cashier`.
- Anything else → sign-out + no-workspace message.

Legacy `/platform-auth` stays as a redirect to `/auth`.

## Security protections
- No public registration; the form only signs in.
- Errors are generic ("Incorrect email or password."); Supabase messages are never surfaced.
- Authorization is decided from live Supabase reads (RLS applied), never from localStorage alone or a URL param.
- Users with no active membership are signed out immediately.
- Selecting a workspace clears stale organization state before activating the new one.
- Sign-out clears `kob.activeOrganization` in addition to `supabase.auth.signOut()`.
- RLS untouched; no schema changes.

## Files created
- `src/features/authentication/types.ts`
- `src/features/authentication/services/authentication.service.ts`
- `src/features/authentication/utils/resolveLoginDestination.ts`
- `src/features/authentication/hooks/useAuthentication.ts`
- `src/features/authentication/components/UnifiedLoginForm.tsx`
- `src/features/authentication/components/WorkspaceSelector.tsx`
- `src/features/authentication/components/AuthLoadingScreen.tsx`
- `UNIFIED_AUTH_REPORT.md`

## Files modified
- `src/routes/auth.tsx` — rewritten as a thin composition of the feature module.
- `src/routes/platform-auth.tsx` — kept as a pure redirect to `/auth`.
- `src/routes/__root.tsx` — removed the `PlatformAuthPage` 404 fallback and its import.

## Files deleted
- `src/features/platform/PlatformAuthPage.tsx` — obsolete second login page.

## Routes
- `/auth` — unified login (form / workspace selector / loading, driven by state).
- `/platform-auth` — redirect only.
- `/platform`, `/admin`, `/cashier` — unchanged; still protected by existing gates/providers.
- `routeTree.gen.ts` was not touched manually; the generator picks up the changes on the next build.

## Test results
- TypeScript: `bunx tsgo --noEmit` → clean.
- Scenario coverage (via logic): single platform / single company owner|admin|manager|cashier / multiple memberships → selector / no membership → signed out + message / suspended org or membership filtered out at query time / session restore on reload / direct `/platform-auth` → redirect.
- Arabic and English switchable on the form and selector; RTL/LTR follows the global i18n direction.

## Remaining notes
The "advanced organization code" hint from the spec is intentionally omitted; membership resolution makes it unnecessary. It can be layered on later as a filter over the resolved memberships without changing auth logic.