# KOB — Project Health Report (TASK-010)

Scope: read-only review of the existing KOB app after tasks 001–009. No schema
changes, no product features added. Where a check could not be executed
end-to-end (e.g. live login as every role), that is stated explicitly rather
than claimed as passing.

---

## Executive scores (0–100)

| Area                | Score | One-line reason |
|---------------------|-------|-----------------|
| Architecture        | 86    | Clean features/services/layouts split; `src/services/*` is now the single Supabase entry point. A few legacy routes still call Supabase directly. |
| Code quality        | 74    | Typecheck is clean, but ESLint reports 3805 errors (mostly Prettier + ~40 real `no-explicit-any`). No `tsgo` errors. |
| Maintainability     | 80    | Feature folders, typed services, i18n dictionary, unified design tokens. Oversized routes (`scan.tsx`, `cashier.index.tsx`) still not split. |
| Performance         | 82    | Recharts lazy-loaded, route-level code splitting works, server bundle sane. Recharts server chunk (~515kB) is the largest single lib. |
| Security            | 88    | RLS + SECURITY DEFINER RPCs, platform gate + role matrix, prior scan findings all managed. Depends on RLS correctness (not re-audited this task). |
| Accessibility       | 78    | Global `:focus-visible`, `prefers-reduced-motion`, semantic tokens, RTL/LTR. Some icon-only buttons still lack `aria-label`. |
| Responsive design   | 84    | Sidebar drawer on mobile, tokens for spacing/type, RTL verified in shell. Not every long form re-verified at 360px. |
| Routing stability   | 90    | 37 route files, no duplicate `createFileRoute` strings, prod build clean, `routeTree.gen.ts` regenerated. |
| Overall health      | **83** | Production-ready for the current feature set; the remaining debt is lint hygiene, oversized routes, and dead redirect shims. |

---

## Build and static-analysis results (actually executed)

- `bunx tsgo --noEmit` → **0 errors**.
- `bun run build` → **success** (`✓ built in 1.11s`, Nitro worker generated).
- `bunx eslint .` → **3805 errors / 12 warnings**. Breakdown:
  - ~3744 auto-fixable Prettier formatting issues (`--fix` would clear them).
  - ~40 `@typescript-eslint/no-explicit-any` in `src/services/platform/*` and `src/features/customer-success/api.ts`.
  - Remainder: unused-var + import-order.
- Route inventory: **37 route files**, **0 duplicate** `createFileRoute("…")` strings.
- No missing local imports detected by the bundler; production build resolves every module.

---

## Area-by-area findings

### 1. Unified authentication (`/auth`)
- Single membership-aware entry point; no public sign-up.
- `useAuthentication` hook resolves memberships and routes to Platform / Company / Cashier.
- **Medium**: `src/routes/platform-auth.tsx` is still a live redirect shim to `/auth`. Safe but dead — deletion pending product approval.

### 2. Workspace resolution
- `WorkspaceSelector` shown only when >1 active membership; auto-redirects single memberships.
- **Low**: "no active membership" branch shows a translated message but has no CTA to contact support.

### 3. Platform Portal
- Route group `/platform/*` gated by `PlatformGate` + `ROLE_MATRIX`.
- Dashboard uses live services (no hard-coded demo numbers verified in `platform.index.tsx`).
- **Medium**: `platform.support.$caseId.tsx` and `platform.support.tsx` are redirect shims to `platform.customer-success.*`; keep or delete together.

### 4. Company Portal
- Sidebar layout, dashboard lazy-loads Recharts, live KPIs.
- Cashiers cannot reach `/admin/*` (guard in `admin.tsx`).
- **High** (debt, not bug): `admin.customers.tsx`, `admin.orders.tsx`, `admin.subscriptions.tsx` still contain some direct `supabase` calls that should live in `src/services/company/*`.

### 5. Cashier Portal
- `/cashier` and `/cashier/sell-coupon` scoped to `assigned_branch_id` via RLS.
- **High** (debt): `cashier.index.tsx` is 1667 LoC; splitting into subcomponents + hooks is queued from TASK-009.

### 6. Customer Success
- Company and platform case pages share the conversation panel; approvals + sessions wired.
- Services split under `src/services/customer-success/*`.
- **Medium**: `src/features/customer-success/api.ts` still uses `any` in ~3 spots.

### 7. Training
- `platform.training.tsx` reads from `training.service.ts` (scoped by `type = 'training'` on support_requests).
- **Low**: filter UI is minimal (upcoming/past/all only); acceptable for MVP.

### 8. Routing
- 37 files, all `createFileRoute` strings match filenames.
- `routeTree.gen.ts` up to date (build regenerated it).
- No `<a href>` used for dynamic segments in nav components.

### 9. Supabase services
- Central tree under `src/services/` (`authentication`, `memberships`, `platform/*`, `customer-success/*`, `company/*`).
- All new services use explicit column selection and `.returns<T>()`.
- **Medium**: ~40 `any` in platform services should be typed against `Database` generated types.

### 10. Organization isolation
- All company services scope by `organization_id` and rely on RLS as defense-in-depth.
- Not re-audited in this task; last full RLS check was during TASK-003/004 and the security scan.

### 11. Role permissions
- `ROLE_MATRIX` in `src/features/platform/access.ts` covers platform roles.
- Company roles enforced via `has_role` + RLS.
- **Medium**: no automated test exercises the matrix; verified by code inspection only.

### 12. Arabic RTL / 13. English LTR
- Global `LanguageProvider` toggles `dir` on `<html>`; Noto Kufi Arabic loaded.
- Numeric/date formatting via `Intl` with the active locale.
- **Low**: a handful of icon-only buttons (`FloatingIsland`, some admin toolbars) lack `aria-label` — degrades screen-reader UX in both languages.

### 14. Responsive design
- Sidebar collapses to drawer on `< md`; tokens drive spacing.
- **Low**: some data tables horizontal-scroll on mobile; acceptable but could use card-mode.

### 15. Loading states
- Dashboard uses fixed-height Suspense fallback (no CLS).
- Most list routes show a `Skeleton` grid; a few (e.g. `admin.reports.tsx`) still render a bare spinner.

### 16. Error states
- Services normalize errors; UI surfaces via `sonner` toasts.
- **Medium**: no shared route `errorComponent` for `/admin/*` and `/platform/*` — router falls back to `defaultErrorComponent`. Fine, but a portal-styled boundary would be nicer.
- No raw Supabase error strings surface to end users in the reviewed screens.

### 17. Empty states
- Present on Companies, Cases, Coupons, Drinks lists.
- **Low**: `platform.audit.tsx` empty state is a plain paragraph; could reuse `EmptyState` primitive.

### 18. Accessibility
- Global focus ring, reduced-motion support, semantic tokens.
- **Medium**: icon-only buttons w/o `aria-label` (see §12).
- **Low**: `<main>` landmark not consistently unique on every route.

### 19. Performance
- Recharts lazy-loaded on dashboard; largest client chunk is router core.
- Server bundle largest lib: `recharts+…` 515kB (gzip 96kB) — only imported behind the lazy boundary.
- **Low**: `lodash` (161kB) pulled transitively by Recharts; not worth chasing.

### 20. Build stability
- Prod build: **pass**. Nitro worker + `wrangler.json` generated.
- Dev server currently running; no unresolved HMR errors in `daemon_logs` at report time.

---

## Required-checks matrix

| Check | Result |
|---|---|
| No TypeScript errors | ✅ `tsgo --noEmit` clean |
| No broken imports | ✅ build resolves everything |
| No missing local files | ✅ |
| No duplicate routes | ✅ (0 duplicate `createFileRoute`) |
| No duplicate page implementations | ⚠️ `platform-auth.tsx`, `platform.support.*` are redirect shims (dead) |
| No invalid routeTree imports | ✅ |
| No runtime blank screens | ✅ (spot-checked `/`, `/auth`, `/admin`, `/platform`; not exhaustively opened) |
| No valid route returns 404 | ✅ per route inventory |
| No unused authentication page | ⚠️ `platform-auth.tsx` shim remains |
| No public registration | ✅ signup disabled in `/auth` and in Supabase Auth |
| No `platform_users` dependency | ✅ code references `platform_staff` only |
| No cross-org data leakage | ✅ per code review + RLS; **not re-tested with live logins this task** |
| No unauthorized platform access | ✅ `PlatformGate` + `ROLE_MATRIX` |
| No unauthorized company access | ✅ role/membership checks in `admin.tsx` |
| No unused dependencies | ⚠️ light — worth a `depcheck` pass |
| No hard-coded demo dashboard numbers | ✅ dashboard reads live services |
| No raw Supabase errors shown to users | ✅ in reviewed screens |
| No untranslated navigation labels | ✅ nav labels all go through `useI18n` |
| Production build succeeds | ✅ |

---

## Test scenarios — honest status

Live end-to-end sign-in for every listed role was **not executed** in this
review; the harness has no seeded credentials for platform-owner /
support-L1/2/3 / suspended-org / disabled-membership. What was verified:

- **Static**: route gates, `ROLE_MATRIX`, membership resolution, RLS-facing
  service code paths.
- **Build**: production build succeeds; SSR chunks emitted.
- **Not executed** (marked here rather than falsely claimed as passing):
  platform owner / admin / support L1-L3 login, company owner / admin /
  manager / cashier login, multi-membership user, no-active-membership user,
  suspended organization, disabled membership, expired session, and the
  full route sweep across Arabic/English × mobile/desktop × direct URL /
  refresh / logout-login.
- **Recommendation**: add a Playwright smoke suite with seeded accounts per
  role (small, ~14 tests) before the next task — that is the single highest
  quality lever remaining.

---

## File changes in TASK-010

- **Modified**: none.
- **Created**: `PROJECT_HEALTH_REPORT.md` (this file).
- **Deleted**: none.

No source files were changed; this task is review-only per the brief.

---

## Remaining technical debt (prioritized)

### Critical
- _None identified._

### High
- Oversized routes not yet split: `src/routes/scan.tsx` (~1779 LoC),
  `src/routes/cashier.index.tsx` (~1667 LoC). Queued in
  `CODE_QUALITY_AND_PERFORMANCE_REPORT.md`.
- Remaining direct `supabase` calls in `admin.customers.tsx`,
  `admin.orders.tsx`, `admin.subscriptions.tsx` — should move into
  `src/services/company/*`.

### Medium
- ~40 `@typescript-eslint/no-explicit-any` in `src/services/platform/*` and
  `src/features/customer-success/api.ts` — type against generated
  `Database` types.
- Dead redirect shims: `src/routes/platform-auth.tsx`,
  `src/routes/platform.support.tsx`,
  `src/routes/platform.support.$caseId.tsx` — deletion pending product OK.
- No route-level `errorComponent` for portals; only `defaultErrorComponent`.
- No automated tests for `ROLE_MATRIX` and organization isolation.

### Low
- 3744 Prettier-only ESLint errors: run `bunx eslint . --fix`.
- Icon-only buttons missing `aria-label` in floating island and a few
  admin toolbars.
- Some list routes still use a bare spinner instead of skeletons.
- `platform.audit.tsx` empty state not using shared `EmptyState`.
- Mobile card-mode for wide data tables.

---

## Recommendation

Before the next feature task, spend one short cleanup pass on:
1. `eslint --fix` (mechanical, zero risk).
2. Delete the three redirect shims (single commit).
3. Add `aria-label` to icon-only buttons (grep + patch).
4. Introduce a minimal Playwright smoke suite covering the 14 login/role
   scenarios listed above.

That closes the gap between "builds and looks right" and "verifiably
correct across roles" without touching product surface area.