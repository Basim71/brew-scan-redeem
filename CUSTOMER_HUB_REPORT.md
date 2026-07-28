# TASK-004.4 — Customer Hub Report

## Features implemented
- Merged `/admin/customers` + `/admin/subscriptions` into a single **Customer Hub** at `/admin/customers`. Subscriptions removed from sidebar (route + DB untouched).
- **Level 1 — Dashboard**: 6 live KPI cards (Total, Active, New this month, Expiring soon, Inactive, VIP) with 5s auto-refresh, `● Live` indicator, "Updated Ns ago" label — Refresh button removed.
- **Smart Insights** cards derived from aggregated data (expiring today, inactive-returnable, VIPs this week, new-this-month) with one-click filter action.
- **Level 2 — List**: search (name/phone/QR-id), status chips (All/VIP/Active/Expiring/Expired/Inactive/New), branch/plan/favorite-drink filters, sort (Newest, Oldest, Highest spend, Most orders, Recently active), **Table ⇄ Grid view** toggle with `localStorage` persistence.
- **Level 3 — Customer 360 drawer** (right-side, no navigation) with: Overview, Loyalty (0–100 score + tier: Excellent/Good/Needs Attention), Membership (renew/upgrade/pause/cancel actions + history), Favorite Drinks + Add-ons breakdown, Recent Orders, Coupons section, Statistics (spend, avg spend, visits/mo, renewals), Timeline, Data-driven Insights (peak visit hour, drink dominance, inactivity, expiry, VIP), Internal Notes (localStorage-persisted).
- Loyalty score: weighted mix of spend (40), orders (30), renewals (15), recency (15).
- VIP: top 10% by spend among customers with ≥3 approved orders.

## Files modified / added
- **Added** `src/features/company/customer-hub/service.ts` — org-scoped bundle loader (customers + subscriptions + orders + coupons + branches + plans).
- **Added** `src/features/company/customer-hub/aggregate.ts` — per-customer aggregation, loyalty scoring, org & per-customer insight generators (no AI).
- **Added** `src/features/company/customer-hub/CustomerHub.tsx` — full page: metrics, insights, toolbar, table/grid.
- **Added** `src/features/company/customer-hub/CustomerDrawer.tsx` — Customer 360 drawer.
- **Added** `src/features/company/customer-hub/notes.ts` — notes + view-preference persistence.
- **Modified** `src/routes/admin.customers.tsx` — renders `CustomerHub`.
- **Modified** `src/features/company/CompanySidebar.tsx` — removed "Subscriptions" nav item; relabeled to "Customer Hub" / "مركز العملاء".
- **Modified** `src/features/company/access.ts` — dropped `/admin/subscriptions` from `CompanyRoute` matrix.
- **Modified** `src/styles.css` — added scoped `.hub-*` design tokens (KOB premium light, warm gold accents, soft shadows, animated live-dot & shine skeletons).

## Responsive improvements
- KPI + grid views auto-fit (`repeat(auto-fit,minmax(...))`).
- Drawer collapses to full width < 640px; two-column KV grid collapses to single column.
- Toolbar wraps on tablet; sidebar collapse preserved from existing shell.

## Performance
- Single parallel `Promise.all` for the six required tables — one round-trip.
- Aggregation done client-side with `useMemo`; re-computed only on bundle change.
- 5s polling gated on `document.visibilityState === "visible"` and `navigator.onLine`; no work when tab hidden/offline.
- No page reloads; drawer updates via re-fetch after subscription status changes.

## Validation results
- `bunx tsgo --noEmit`: **clean** (0 errors).
- Manual RLS check: all queries go through generated Supabase client → org isolation preserved.

## Build status
- Typecheck: **PASS**.
- Sidebar link to `/admin/subscriptions` removed; route file left intact (no functional loss, DB untouched).