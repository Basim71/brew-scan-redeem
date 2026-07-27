# Company Portal v2 — Report

## Overview
Rebuilt the `/admin` company portal with a sidebar-based navigation, role-aware routing, and live Supabase metrics — replacing the old horizontal layout. Database schema, RLS, and business logic are unchanged.

## Navigation
Responsive sidebar (`src/features/company/CompanySidebar.tsx`) with collapse + mobile drawer, filtered by role via `COMPANY_ROLE_MATRIX` in `src/features/company/access.ts`. Cashiers are blocked from all `/admin` routes by `RoleGate` in `src/routes/admin.tsx`.

Items: Overview, Customers, Subscriptions, Orders, Drinks, Coupons, Sell Coupon, Plans, Branches, Cashiers, Reports, Customer Success, Settings.

## Dashboard
`src/routes/admin.index.tsx` renders live metrics from `loadCompanyDashboard`:
- KPIs: customers (+ new this month/week), active subscriptions (+ expiring), revenue today/MTD, orders today (+ pending).
- Charts: 30-day revenue area chart, 30-day subscription trend.
- Latest orders list, branch performance MTD.
- Loading skeletons, empty states, error banner.

## Architecture
```
src/features/company/
├── access.ts                 # role matrix, canAccessCompanyRoute
├── CompanyLayout.tsx         # shell (sidebar + main)
├── CompanySidebar.tsx        # responsive nav, role-filtered
├── dashboard/service.ts      # loadCompanyDashboard + chart builders
├── customers/service.ts      # listCustomers
└── orders/service.ts         # listOrders, approveOrder, rejectOrder
```
All queries scoped through Supabase RLS (organization-scoped by policy). No localStorage-derived org IDs.

## Security
- `RoleGate` at `/admin` blocks non-admin roles (including cashier).
- `OrganizationProvider` validates active membership + organization type.
- Suspended orgs blocked upstream by auth flow.
- Cross-org access prevented by RLS policies (unchanged).

## Design
Premium light SaaS palette: warm white bg, cream cards, espresso typography, gold accents. Hierarchy differentiates KPIs, charts, activity, and branch performance. Full RTL/LTR via `useI18n`.

## Files
### Created
- `src/features/company/access.ts`
- `src/features/company/CompanyLayout.tsx`
- `src/features/company/CompanySidebar.tsx`
- `src/features/company/dashboard/service.ts`
- `src/features/company/customers/service.ts`
- `src/features/company/orders/service.ts`
- `COMPANY_PORTAL_REPORT.md`

### Modified
- `src/routes/admin.tsx` — uses `CompanyLayout` + `RoleGate`
- `src/routes/admin.index.tsx` — new dashboard
- `src/routes/admin.customers.tsx`
- `src/routes/admin.orders.tsx`
- `src/routes/admin.reports.tsx`
- `src/routes/admin.settings.tsx`
- `src/styles.css` — company portal tokens/classes

### Deleted
None (old horizontal nav replaced in-place).

## Validation
- Dev server: 200 OK on `/`.
- Owner/admin/manager: see full nav per matrix; cashier: blocked at `/admin`.
- AR (RTL) + EN (LTR) verified via `useI18n` dir attribute.
- Loading skeletons on KPI grid; empty states on activity + branch lists; error banner on service errors.
- No schema changes; no platform portal changes.