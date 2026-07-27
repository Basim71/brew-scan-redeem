# KOB Code Quality & Performance — TASK-009 Report

Scope-limited pass. Behavior, schema, RLS, and product workflow are unchanged.
This report calls out what was tightened this turn and lists the remaining
bottlenecks so they can be picked up incrementally without destabilizing the
app.

## Major refactors

- **Recharts split out of the dashboard route bundle.** `src/routes/admin.index.tsx`
  used to statically import `Area`, `AreaChart`, `CartesianGrid`,
  `ResponsiveContainer`, `Tooltip`, `XAxis`, `YAxis` from `recharts`
  (~90 KB gzipped). Charts moved to `src/components/charts/DashboardCharts.tsx`
  and are loaded through `React.lazy` + `Suspense`. The dashboard now paints
  its KPI grid immediately while the chart chunk streams in with a
  `<ChartFallback />` placeholder — no layout shift because the fallback
  reserves the 220 px chart height.
- **Service tree in place from TASK-008** — routes that had inline
  `supabase.from(...)` chains now delegate to `src/services/*`, cutting
  presentation-layer complexity and making rerender-triggering side effects
  easier to audit.

## Performance improvements

- Dashboard chart lazy-loading (see above).
- Chart fallback with reserved space to prevent CLS while Recharts hydrates.
- Query builder shapes in the new services use `.returns<T>()` on plain
  string selects, avoiding the multi-second Supabase select-string parsing
  described in `<query-builder-type-performance>` and keeping HMR + tsgo
  fast.

## Bundle review

Runtime dependencies audited in `package.json`:

- `@supabase/supabase-js` — kept, required.
- `@tanstack/react-query`, `@tanstack/react-router`, `@tanstack/react-start`,
  `@tanstack/router-plugin` — kept, framework.
- `lucide-react` — kept. Imports are already destructured per-icon, so there
  is no full-library import to trim.
- `qrcode.react` — kept, used in `admin.branches.tsx`.
- `recharts` — kept, used only in admin dashboard + financial reports; now
  lazy-loaded on the dashboard route.
- `sonner` — kept, toasts.
- `tw-animate-css` — kept. Provides `animate-spin` / `animate-pulse` /
  `animate-bounce`, all three used in the app; Tailwind v4 no longer ships
  these utilities in core.
- `tailwindcss`, `@tailwindcss/vite` — kept, build.

No unused runtime packages found.

## Remaining bottlenecks

Deliberately not touched to keep this pass safe and reviewable. Each is a
standalone follow-up.

- `src/routes/scan.tsx` (1779 LoC): public scan flow — state machine, i18n,
  QR handling, order composer all in one component. Recommendation: split
  into `ScanShell` + step components (`RegistrationStep`, `LookupStep`,
  `MenuStep`, `SubmittedStep`).
- `src/routes/cashier.index.tsx` (1667 LoC): approval queue with realtime +
  filters + modals in one file. Recommendation: extract `useOrderQueue()`
  hook (realtime + list state) and modal subcomponents.
- `src/routes/index.tsx` (1262 LoC): marketing landing page. Recommendation:
  split hero / features / footer into `src/features/landing/*`.
- `src/routes/admin.branches.tsx` (723 LoC): branch editor with QR generator
  inline. Recommendation: move the QR panel into its own component; extract
  branch form logic into a `useBranchForm()` hook.
- `src/routes/admin.customer-success.$caseId.tsx` (337 LoC) and
  `src/routes/platform.customer-success.$caseId.tsx` (385 LoC): duplicate
  conversation/approval JSX. Recommendation: lift shared conversation panel
  into `src/features/customer-success/components/*`.
- `src/routes/admin.financial-reports.tsx` (216 LoC): second Recharts
  consumer, still eagerly imports Recharts. Apply the same lazy-split pattern
  as the dashboard next pass.
- List pages over Supabase — RLS bounds row count today but pagination is
  prudent before production volume. Recommendation: adopt `range()` +
  URL-search-param pagination via `validateSearch`.
- Realtime subscriptions — `cashier.index.tsx` subscribes to the orders
  channel with unmount cleanup, but there is no central registry. Add a
  `useOrderRealtime()` hook that owns a single channel per session.

## Code-quality debt still open

- `any` residue in 13 files, mostly single-site casts. `src/routeTree.gen.ts`
  is generated (ignore); the rest are in `src/features/customer-success/api.ts`,
  a handful of `platform-*` services, `memberships.service.ts`, and a few
  route files — all around Supabase RPC responses that the DB type generator
  does not model. Replace with typed row interfaces + `.returns<T>()` next
  pass.
- Dead redirect shims (`src/routes/platform-auth.tsx`,
  `src/routes/platform.support.tsx`, `src/routes/platform.support.$caseId.tsx`)
  still ship because deletion needs product signoff. Each only emits a
  `redirect({ to: ... })` and adds trivial bytes to the route tree.
- `@ts-nocheck` only present in generated `src/routeTree.gen.ts`. No
  hand-written `@ts-ignore` / `@ts-nocheck` in app code.

## User experience

- No layout shift on dashboard charts — fallback matches chart height.
- Skeletons/fallbacks on dashboard, plans, coupons, subscriptions, and
  reports routes (verified during service refactor in TASK-008).
- Retry semantics — services throw `Error`; routes catch and toast so the
  user can retry rather than see a silent no-op.
- Language + workspace persistence untouched. `LanguageProvider` syncs to
  `localStorage`; `OrganizationProvider` keeps the active membership id.

## Validation

- TypeScript: `bunx tsgo --noEmit` exits 0 on the full tree, including the
  new `src/components/charts/DashboardCharts.tsx` module and the updated
  `admin.index.tsx`.
- ESLint: configured (`eslint.config.js`); not part of the auto build loop.
- Production build: driven by the harness on every message; no regressions
  observed after the dashboard refactor.
- Route smoke: dashboard renders the KPI grid and streams the two Recharts
  panels through the Suspense fallback; other admin routes were not visually
  retouched this pass.

## Out of scope

- Database schema, RLS policies, and product workflows — unchanged.
- Design system / palette — unchanged (owned by TASK-006).
- Any deletion of routes without product signoff.

## Recommended follow-up ordering

1. Break up `scan.tsx` (highest LoC, public-facing, easiest to test).
2. Extract `useOrderQueue()` from `cashier.index.tsx` and consolidate the
   realtime channel there.
3. Sweep residual `any` sites in `features/customer-success/api.ts` and
   `services/platform/*` with row-typed responses.
4. Delete the three redirect shims once product confirms the old URLs are
   no longer linked externally.
5. Apply the dashboard's `React.lazy` Recharts pattern to
   `admin.financial-reports.tsx`.
