## Scope

Wire the `/platform/*` portal into a coherent, RBAC-gated workspace for KOB employees only. No schema changes. No company-portal features leak in.

## Routes

```text
src/routes/
  platform.tsx                                (keep, restructure nav)
  platform.index.tsx                          (rewrite: executive dashboard, real data)
  platform.companies.tsx                      (rewrite: search + filters + list)
  platform.companies.$organizationId.tsx      (NEW: company detail with tabs)
  platform.customer-success.tsx               (NEW, moved from platform.support.tsx)
  platform.customer-success.$caseId.tsx       (NEW, moved from platform.support.$caseId.tsx)
  platform.training.tsx                       (NEW: upcoming/past training sessions)
  platform.users.tsx                          (keep, harden)
  platform.announcements.tsx                  (NEW: list + composer, viewer-only for lower roles)
  platform.audit.tsx                          (NEW: filtered audit log)
  platform.settings.tsx                       (keep, harden)
  platform.support.tsx                        → redirect shim to /platform/customer-success
  platform.support.$caseId.tsx                → redirect shim to /platform/customer-success/$caseId
```

`routeTree.gen.ts` is regenerated automatically.

## Nav + layout

`src/routes/platform.tsx` renders the existing `AppWorkspace` chrome with a sidebar-style list of items driven by role:

- Overview (all roles)
- Companies (owner, admin)
- Customer Success (all roles, filtered by role at data layer)
- Training Sessions (owner, admin, support_l2, support_l3)
- Platform Users (owner, admin)
- Announcements (all can view; only owner/admin can compose)
- Audit Logs (owner, admin)
- Settings (owner only)

Menu items filter by `usePlatform().profile?.role`; **and** each route wraps itself in `<PlatformGate allow={[...]}>` so a direct URL is refused even when the link is hidden. Company/cashier users are blocked upstream because they have no platform membership — `PlatformGate` already denies them.

## Data services (no Supabase in components)

```text
src/services/platform/
  platform-dashboard.service.ts      (rewrite of src/services/platform-dashboard.ts)
  companies.service.ts               (list, get, memberCount, statusChange stub)
  platform-users.service.ts          (from current inline call in platform.users.tsx)
  platform-audit.service.ts          (reads support_activity_log + case events)
  training.service.ts                (reads support_requests where type='training')
  announcements.service.ts           (thin wrapper; storage table TBD — see Open Items)
```

Dashboard exposes real counts pulled from existing tables:

- Total / Active / Suspended / New-this-month companies — `organizations` where `organization_type='company'`.
- Open cases / awaiting-approval / active sessions — `customer_success_cases`, `support_sessions`.
- Upcoming training — `support_requests` where `type='training'` and `scheduled_at >= now()`.
- Platform staff count — `platform_staff` view (already exists).
- Recent activity — `support_activity_log` last 20 rows.
- System status — derived from a lightweight `db_health` ping (client-side `select 1` via `organizations` head count).

No demo constants. Loading skeletons + inline error card for partial failures.

## Companies

List page: search box, status filter chips (all / active / suspended), sortable columns (code, AR name, EN name, status badge, created, last-activity, member count, open case count). Counts fetched in one round-trip via `select` with foreign-table `count`.

Detail page `/platform/companies/$organizationId` with tabs:
1. Overview — code, names, status, created, contact email/phone.
2. Members — join `organization_members` + `profiles` for name/email/role/status.
3. Branches — `branches` count + list, read-only.
4. Subscriptions — active count and expiring soon (`subscriptions` where `status='active'` and `end_date <= now()+7d`).
5. Customer Success — cases scoped to this org.
6. Training — training requests scoped to this org.
7. Audit — activity log scoped via sessions/cases for this org.
8. Status actions — suspend / reactivate button (owner + admin only).

## Customer Success migration

Copy current `platform.support.tsx` and `platform.support.$caseId.tsx` verbatim into the new file names, update the `createFileRoute` string, and replace their bodies with `redirect({ to: "/platform/customer-success" })` (and the case variant) so any bookmarks or external links still resolve. Internal `navigate({ to: "/platform/support/..." })` calls are updated to the new path.

## RBAC helpers

```text
src/features/platform/access.ts
  export const ROLE_MATRIX = {
    "/platform":                    ["platform_owner","platform_admin","support_level_1","support_level_2","support_level_3"],
    "/platform/companies":          ["platform_owner","platform_admin"],
    "/platform/customer-success":   [/* all */],
    "/platform/training":           ["platform_owner","platform_admin","support_level_2","support_level_3"],
    "/platform/users":              ["platform_owner","platform_admin"],
    "/platform/announcements":      [/* all view; write in service */],
    "/platform/audit":              ["platform_owner","platform_admin"],
    "/platform/settings":           ["platform_owner"],
  }
  export function canAccess(path, role): boolean
```

Route files use `<PlatformGate allow={ROLE_MATRIX["/platform/companies"]}>`. Nav list filters through `canAccess`. Announcement composer button is gated on `role === "platform_owner" || "platform_admin"`.

## Design

Keep existing `.platform-*` CSS tokens (warm-cream surfaces, gold accents, espresso ink). Add:

- Sidebar-style vertical nav variant inside `AppWorkspace` (light cream column, muted gray borders, active-item gold underline).
- KPI cards, table rows, and tab strip aligned to the KOB palette. No new gradients.
- Full RTL/LTR via `dir` attribute already emitted by `LanguageProvider`.

Arabic strings from the existing dictionary; add missing keys under existing `platform_*` prefix.

## Files

**Create**
- `src/routes/platform.companies.$organizationId.tsx`
- `src/routes/platform.customer-success.tsx`
- `src/routes/platform.customer-success.$caseId.tsx`
- `src/routes/platform.training.tsx`
- `src/routes/platform.announcements.tsx`
- `src/routes/platform.audit.tsx`
- `src/features/platform/access.ts`
- `src/features/platform/dashboard/` (small components: KpiCard, ActivityList, SystemStatus)
- `src/features/platform/companies/` (CompanyTable, CompanyTabs, MemberList, BranchList, StatusActions)
- `src/features/platform/announcements/` (AnnouncementList, AnnouncementComposer)
- `src/features/platform/audit/AuditTable.tsx`
- `src/features/platform/training/TrainingList.tsx`
- `src/services/platform/platform-dashboard.service.ts`
- `src/services/platform/companies.service.ts`
- `src/services/platform/platform-users.service.ts`
- `src/services/platform/platform-audit.service.ts`
- `src/services/platform/training.service.ts`
- `src/services/platform/announcements.service.ts`
- `PLATFORM_PORTAL_REPORT.md`

**Rewrite**
- `src/routes/platform.tsx` — role-filtered sidebar-style nav, wired to new routes.
- `src/routes/platform.index.tsx` — real data via new service; loading + error states.
- `src/routes/platform.companies.tsx` — filters, richer columns, uses `companies.service`.
- `src/routes/platform.users.tsx` — uses `platform-users.service`.
- `src/routes/platform.settings.tsx` — thin, owner-gated.
- `src/routes/platform.support.tsx` — redirect shim.
- `src/routes/platform.support.$caseId.tsx` — redirect shim.
- `src/services/platform-dashboard.ts` — deleted after callers move.

## Validation

- `bunx tsgo --noEmit` clean.
- Preview: `/platform` (dashboard), `/platform/companies`, `/platform/companies/$id`, `/platform/customer-success`, redirect from old `/platform/support`, `/platform/training`, `/platform/users`, `/platform/announcements`, `/platform/audit`, `/platform/settings` all render.
- Attempt direct URL to `/platform/settings` while logged in as a `support_level_1` account: `PlatformGate` shows denied panel.
- Sign in as company owner (non-platform member): `/platform` redirects/denies.
- Arabic + English confirmed on the dashboard and companies list.

## Open items to confirm before I start

1. **Announcements storage** — no `announcements` table exists. Options:
   a) Ship page as read/write against a new lightweight `platform_announcements` table (requires migration — you said no schema changes).
   b) Ship as **read-only stub sourced from a static JSON list in code** until you approve the migration.
   c) Skip the page for now.
   Default I will take without further input: **(b) read-only stub with an empty-state CTA** so no schema changes happen this task.

2. **Suspend / reactivate company action** — I will build the UI + confirm-modal but only call an existing update on `organizations.status`. If RLS forbids it for the caller's role, the button surfaces a clear error rather than silently failing. No new RPC.

3. **Sidebar vs current top nav** — task says "sidebar". I will render the platform nav as a left rail (RTL: right rail) inside `AppWorkspace`; company portals keep the existing floating island.

Say "go" and I will implement in order: services → gates → dashboard → companies → migration + redirects → training/announcements/audit → users/settings polish → report.
