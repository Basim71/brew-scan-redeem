# TASK-004.3 — Business Command Center Report

## Overview
Rebuilt `/admin` from a passive KPI dashboard into a decision-oriented
Business Command Center. Every widget answers "what should I do now?".

## Features implemented

**Header**
- Time-aware greeting (Good Morning / Afternoon / Evening).
- Company name from `useOrganization`, current date + time (localized, RTL/LTR).
- Live status badge with pulsing dot + "Updated X ago" indicator.
- Offline detection (`navigator.onLine` + failed poll) with reconnect message.
- Removed: "Overview" title, "Sell Coupon" header button, manual "Refresh".

**Auto-refresh**
- Polls `loadCompanyDashboard()` every 5s (`POLL_MS`), paused when tab hidden
  (`document.visibilityState`).
- Silent updates — no page flicker; last-fetched timestamp updates in place.
- Animated numeric counters (`useAnimatedNumber` easeOutCubic) on KPI values.

**Section 1 — Today's Focus**
Priority action cards derived from live data: expiring memberships,
pending orders, revenue drop vs. yesterday, coupon inventory, trending drink.
Each card has priority color, title, description, and a single action link.
Empty state confirms nothing urgent.

**Section 2 — Business Health**
Four vitals with green/amber/red status: Membership Health,
Customer Activity, Coupons inventory, Revenue Trend (vs. yesterday %).

**Section 3 — Live Metrics**
Eight KPIs with animated counters: Active Members, Drinks Redeemed Today,
Revenue Today, Orders Today, Pending Renewals, New Customers,
Available Coupons, Active Branches.

**Section 4 — Today's Opportunities**
Revenue-growth suggestions: welcome new customers, rising drink campaign,
underperforming branch, renewal batch. Each has reason + one-click action.

**Section 5 — Live Activity**
Real-time merged feed of latest orders (redeemed/requested/rejected) and
new customers. Rows animate in on update. Auto-scrolls internally.

**Section 6 — Top Products**
Drink popularity list with thumbnail, share bar, month volume, and
week-over-week trend chip. Falls back gracefully if no image.

**Section 7 — Branch Performance**
Sortable comparison table (Revenue / Orders / Members) with today's orders,
MTD revenue, active members, growth, and status (Healthy / Watch / Low).

**Section 8 — Quick Actions**
Eight large shortcut cards to New Customer, Sell Membership, Create Coupon,
Add Drink, Create Plan, Reports, Employees, Customer Success.

**Section 9 — Business Insights**
Rule-based (non-AI) insights from live data: revenue delta, top drink
outperforming runner-up, new customers this week, active memberships.

**Charts**
Retained only a compact 200px revenue trend as a supporting sidebar chart.
Removed the second full-size subscription chart (low actionability).

## Files modified

- `src/features/company/dashboard/service.ts` — extended `DashboardStats`
  and `DashboardPayload` with `revenueYesterday`, `approvedOrdersToday`,
  `newCustomersToday`, `availableCoupons`, `expiringSoon`, `recentCustomers`,
  `drinks`, `activeSubsByBranch`. Added `buildDrinkPopularity`. Extended
  `buildBranchPerformance` with today metrics + active members. All queries
  batched in one `Promise.all` (single round trip).
- `src/routes/admin.index.tsx` — thin route wrapper; renders `CommandCenter`.
- `src/features/company/dashboard/CommandCenter.tsx` — new component with
  all 9 sections, 5s polling loop, animated counters, offline/online
  handling, sortable table.
- `src/styles.css` — appended `.cmd-*` design tokens (~250 lines): premium
  glass cards, warm-white/cream/espresso/gold palette, soft shadows, live
  pulse animation, skeleton shimmer, RTL-safe layouts.

## Performance improvements

- Single-batch data load via `Promise.all` (no waterfall).
- Recharts lazy-loaded via `React.lazy` behind `Suspense`.
- Polling paused when tab hidden (saves credits + bandwidth).
- No page reload; state updates in place — HMR-friendly, no flicker.
- Animated counters via `requestAnimationFrame`, cancelled on unmount.

## Responsive improvements

- All grids use `auto-fit` with `minmax` — scale from 8-col to 1-col
  seamlessly.
- Two-panel rows collapse to 1 column below 900px.
- Header wraps cleanly on mobile; live badge stacks below title.
- Table container is horizontally scrollable on narrow screens.
- Font sizes and paddings tuned in `@media (max-width: 600px)`.
- Full RTL support — no hard-coded `left/right`, uses `start/end` where
  possible.

## Validation

- `bunx tsgo --noEmit` — clean (no errors).
- No new dependencies added.
- RLS untouched; all data reads go through existing services which
  filter by `organization_id`.
- No manual refresh button, no page reload, no Sell Coupon header CTA
  (per spec).

## Build status

Typecheck passes. Dev server hot-reloads the new dashboard. Ready for
preview.