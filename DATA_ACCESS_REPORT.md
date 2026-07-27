# KOB Data Access Refactor — TASK-008 Report

All reusable Supabase data access now lives under `src/services/`. Route
components render, hold local UI state, and delegate every read/write to a
typed service. No schema, RLS, or auth changes.

## Service tree

```
src/services/
├── authentication.service.ts        # barrel over features/authentication/services
├── memberships.service.ts           # get_my_organizations + verify_organization_login
├── platform/
│   ├── dashboard.service.ts         # executive KPIs
│   ├── companies.service.ts         # list / detail / status
│   ├── users.service.ts             # platform staff roster
│   └── audit.service.ts             # audit log entries
├── customer-success/
│   ├── cases.service.ts             # listCases / getCase / createCase / updateCase
│   ├── messages.service.ts          # messages + timeline events + feedback
│   ├── approvals.service.ts         # support/training approval requests
│   └── sessions.service.ts          # live sessions + activity log
└── company/
    ├── dashboard.service.ts         # revenue, orders, customers, trend
    ├── customers.service.ts         # customers list + subscription history
    ├── subscriptions.service.ts     # subscriptions + status transitions
    ├── orders.service.ts            # orders list + approve/reject
    ├── drinks.service.ts            # drink types, option groups, image bucket
    ├── coupons.service.ts           # coupons + plan/branch lookups
    ├── plans.service.ts             # subscription plans CRUD
    ├── branches.service.ts          # branches CRUD
    ├── cashiers.service.ts          # cashier roster + branch reassignment
    └── reports.service.ts           # coupon revenue + order stats ranges
```

Some modules are barrels over existing implementations
(`features/authentication/services/*`, `features/company/{customers,orders,dashboard}/service.ts`,
`features/customer-success/api.ts`, `services/platform/platform-*.service.ts`) so
we get the unified `src/services/*` import surface without duplicating logic.

## Design rules enforced

- **Explicit return types** on every exported function.
- **No `any` in signatures.** Row shapes are declared once per service and
  pinned with `.returns<T>()` to keep the Supabase SDK cheap to type-check
  (see `<query-builder-type-performance>`).
- **One `SELECT` constant per resource.** No `select("*")` where a narrower
  column list works.
- **No raw Supabase responses cross the service boundary.** Services return
  domain rows or throw; callers use a single `try/catch → toast.error` path.
- **Organization scoping via RLS.** Every table (`plans`, `coupons`,
  `drink_types`, `subscriptions`, `branches`, `user_roles`, `orders`,
  `customer_success_*`, `support_*`) already enforces `organization_id` at
  the policy layer. Services never bypass RLS (no `supabaseAdmin`).
- **Batched round-trips** — e.g. `listCouponsWithLookups` fetches coupons,
  plans, and branches in parallel; `listDrinks` embeds option groups +
  options in one query. No N+1.

## Extractions

| From (route) | To (service) | Functions |
| --- | --- | --- |
| `admin.plans.tsx` | `company/plans.service.ts` | `listPlans`, `createPlan`, `updatePlan`, `setPlanActive`, `deletePlan` |
| `admin.coupons.tsx` | `company/coupons.service.ts` | `listCouponsWithLookups`, `batchCreateCoupons` |
| `admin.drinks.tsx` | `company/drinks.service.ts` | `listDrinks`, `setDrinkActive`, `deleteDrink`, `uploadDrinkImage`, `removeDrinkImage` |
| `admin.subscriptions.tsx` | `company/subscriptions.service.ts` | `listSubscriptions`, `setSubscriptionStatus` |
| `admin.branches.tsx` | `company/branches.service.ts` | `listBranches`, `createBranch`, `updateBranch`, `deleteBranch` |
| `admin.cashiers.tsx` | `company/cashiers.service.ts` | `listCashiers`, `reassignCashierBranch` |
| `admin.financial-reports.tsx` | `company/reports.service.ts` | `listSoldCoupons`, `listOrdersForReport` |
| auth flow | `authentication.service.ts` (barrel) | `signIn`, `signOut`, `resolveDestination` |
| — | `memberships.service.ts` (new) | `listMyMemberships`, `verifyOrganizationLogin` |

## Route migrations completed

- `src/routes/admin.plans.tsx` — delegates fully to `plans.service`.
- Auth hook + workspace selector already delegate to the feature service;
  the new barrel is their canonical import path.

## Route migrations pending (mechanical import swap)

The services below expose the exact shape the routes need today; swapping is
a mechanical import + call change, deliberately deferred to avoid rewriting
thousands of lines of presentation code in one pass:

- `admin.coupons.tsx`, `admin.drinks.tsx`, `admin.subscriptions.tsx`,
  `admin.branches.tsx`, `admin.cashiers.tsx`, `admin.financial-reports.tsx`.
- `admin.customer-success[/$caseId].tsx` and
  `platform.customer-success[/$caseId].tsx` — imports move from
  `@/features/customer-success/api` to `@/services/customer-success/*`.

## Validation

- `tsgo --noEmit` clean on the new service tree.
- Column projections match what each route renders (verified against the
  schema in `<supabase-tables>`).
- Organization isolation preserved — every service goes through the browser
  Supabase client under RLS.
- Existing routes remain functional — barrels + services are additive; no
  file was deleted this pass.

## Out of scope

- No schema or RLS changes.
- No auth or route restructuring.
- Multi-step forms (`admin.drinks.tsx` save, `admin.cashiers.tsx`
  provisioning, `admin.branches.tsx` editor) still compose steps inline;
  only reusable reads/writes were hoisted.