# Company Settings Module — TASK-004.1 Report

A complete, role-aware Company Settings workspace for `/admin/settings`. Scoped to the active organization via `useOrganization()` — never reads an org ID from URL, form, or `localStorage` directly. RLS on every underlying table (`organizations`, `organization_settings`, `organization_members`, `branches`) enforces cross-org isolation. **No database schema changes were made.**

## Route

`/admin/settings` — protected by the existing `<RoleGate allow="admin">` in `src/routes/admin.tsx` (cashiers already blocked) plus a defensive per-role check inside the route itself. Companion `/platform/settings` is untouched.

## Implemented sections

| # | Section | Backing data | Editable |
| - | - | - | - |
| 1 | Company Profile | `organizations` (`name_ar`, `name_en`, `email`, `phone`) | ✓ (org code + status read-only) |
| 2 | Branding | `organizations` (`logo_url`, `primary_color`, `secondary_color`), `organization_settings.background_url` | ✓ (logo via direct URL) |
| 3 | Branches summary | `branches` list + link to `/admin/branches` | link-only |
| 4 | Subscription Rules | `organization_settings.one_drink_per_day` | read-only, labeled |
| 5 | Ordering Rules | `organization_settings.customer_registration_enabled`, `customer_comments_enabled` | ✓ |
| 6 | Notifications | — | not-supported empty state |
| 7 | Team & Permissions | `organization_members` (with profile + branch) | ✓ role change + status toggle |
| 8 | Customer Success | link to `/admin/customer-success` | link-only |
| 9 | Security | `supabase.auth.resetPasswordForEmail`, `signOut({ scope: "global" })` | ✓ |
| 10 | Localization | `organization_settings.default_language`, `currency`, `timezone` | ✓ |
| 11 | Integrations | Status pills for backend / storage / auth email / WebRTC | read-only |
| 12 | Audit Activity | — | not-supported empty state |
| 13 | Danger Zone | Owner-only suspension request (soft, logged locally) | owner-only |

## Permissions matrix

| Section | owner | admin | manager | cashier |
| - | - | - | - | - |
| Company Profile | edit | edit | read-only | blocked |
| Branding | edit | edit | — | blocked |
| Branches summary | view | view | view | blocked |
| Subscription Rules | view | view | view | blocked |
| Ordering Rules | edit | edit | edit | blocked |
| Notifications | view | view | — | blocked |
| Team & Permissions | edit | edit (cannot touch owner row) | — | blocked |
| Customer Success | view | view | view | blocked |
| Security | edit | edit | — | blocked |
| Localization | edit | edit | edit | blocked |
| Integrations | view | view | — | blocked |
| Audit | view | view | — | blocked |
| Danger Zone | owner only | — | — | blocked |

Cashiers are blocked at the route by `<RoleGate allow="admin">` and never see the settings nav.

## Guardrails

- Active-membership validated via `useOrganization()` (context returns `role` derived server-side by RLS + the resolve-membership flow). No trust in URL/form/localStorage for org identity.
- `updateMemberRole` refuses to demote the **last owner**, and admins cannot escalate to `owner` (only owners see the `owner` option in the role select).
- Company users cannot change `organization_type`, `status`, `owner_user_id`, `organization_code`, `slug`, or timestamps — those keys are stripped from any profile update before the write.
- Direct company suspension/deletion is not exposed. Danger Zone offers a soft "request suspension" action that surfaces a flash and is intended to route through the KOB platform team (existing closed SaaS model).
- No storage service-role credentials are exposed. Logo entry uses direct URL input, reusing existing storage patterns.
- No secrets are rendered anywhere (integrations panel shows connection status only).

## UX

- Left settings nav on desktop (sticky), compact `<select>` on mobile — no old horizontal navigation.
- Sticky bottom save bar appears only when there are unsaved changes, plus a `beforeunload` warning.
- Success/error flash toasts (auto-dismiss).
- Loading skeletons, empty states, and error banners on every section.
- Full RTL + LTR support driven by `useI18n()`.
- KOB v2 premium light palette reused (warm white, cream cards, espresso headings, restrained gold accents).

## Data services

Created:

- `src/services/company/company-settings.service.ts` — `getOrganizationProfile`, `updateOrganizationProfile`, `getOrganizationSettings`, `upsertOrganizationSettings`. Typed rows, explicit column projection, no `select("*")`.
- `src/services/company/company-members.service.ts` — `listCompanyMembers`, `updateMemberRole` (with last-owner guard), `setMemberStatus`.

All writes go through the browser Supabase client under RLS. `service_role` is never used.

## Missing schema (not created — reported per brief)

Nothing is required to ship the sections above. The following are gaps in the *current* DB that would upgrade certain sections from "empty state" to "fully editable":

1. **Notification preferences.** No `organization_notification_settings` table exists. Would need `(organization_id, event_key text, channel text, enabled bool, recipients text[])` or similar to persist which events go to which channel (in-app / email / browser).
2. **Company-wide audit log.** Case-scoped events exist in `customer_success_case_events`, but there is no `organization_activity_log(organization_id, actor_user_id, action, entity, before jsonb, after jsonb, created_at)` for profile/settings/role changes.
3. **Branch operating hours + QR config.** `branches` currently stores `name_*`, `address_*`, `is_active` only — no hours/QR fields.
4. **Legal name, website, business category, tax ID, address on `organizations`.** Only `name_ar`, `name_en`, `email`, `phone`, `logo_url`, `primary_color`, `secondary_color` are available today.

Each of the above is intentionally rendered as a clearly-labeled read-only, link-out, or "not yet supported" surface. **No migration was created; awaiting explicit approval before proposing SQL.**

## Files

### Created
- `src/services/company/company-settings.service.ts`
- `src/services/company/company-members.service.ts`
- `src/features/company/settings/CompanySettingsShell.tsx`
- `COMPANY_SETTINGS_REPORT.md`

### Modified
- `src/routes/admin.settings.tsx` — replaced old flat settings form with the new shell + route-level guard + head metadata.
- `src/styles.css` — appended `.settings-*` block (nav, save bar, flash, skeletons, tables, danger).

### Deleted
None.

## Validation

- **TypeScript**: `bunx tsgo --noEmit` → clean, no errors.
- **Route generation**: `/admin/settings` remains a child of `/admin`, protected by `<RoleGate allow="admin">`.
- **Manual walkthrough** exercised: profile edit + save bar, ordering toggle, localization change, team role select shows owner option only for owners, disable button hidden for owner rows, danger zone confirm-twice flow, mobile section selector.
- **RLS**: services never reference `supabaseAdmin`; every read/write filters by `organization_id` and is additionally scoped by existing RLS policies on the four tables involved.

## Out of scope

- No schema, RLS, or auth changes.
- No new notification, audit, or integration backends.
- No changes to platform settings or platform portal.
- Branch invitations and provisioning continue to live on `/admin/cashiers`.