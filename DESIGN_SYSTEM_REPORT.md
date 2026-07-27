# KOB Unified Design System — TASK-006 Report

One coherent design vocabulary shared by every KOB surface: Unified
Authentication, Platform Portal, Company Portal, Cashier Portal, and
Customer Success. No business logic, authorization, or database
changes. No new UI libraries.

## 1. Tokens

All tokens live in `src/styles.css` and are exposed both as CSS
custom properties (`--kob-*`) and as Tailwind v4 color utilities
(`bg-kob-gold`, `text-kob-espresso`, …) via `@theme inline`.

### Colors (semantic)
| Token | Purpose |
| --- | --- |
| `--kob-warm-white` | App background on light surfaces |
| `--kob-soft-cream` | Card surface / foreground on espresso |
| `--kob-espresso` | Primary dark surface, headings |
| `--kob-medium-brown` | Secondary surfaces, dividers |
| `--kob-gold` / `--kob-gold-bright` / `--kob-gold-muted` | Brand accent + hover/muted variants |
| `--kob-soft-gray` | Neutral text, borders |
| `--kob-success` | Approved, active, resolved |
| `--kob-warning` | Pending, upcoming |
| `--kob-error` | Rejected, destructive, expired |
| `--kob-info` | Informational, links, live sessions |

Each status token pairs with a `-foreground` counterpart for contrast.

### Typography
- `--kob-font-display` — Playfair Display (LTR) / Noto Kufi Arabic (RTL) for headings.
- `--kob-font-sans` — Inter (LTR) / Noto Kufi Arabic (RTL) for UI text.
- `--kob-font-numeric` — tabular numerics for metrics/tables.
- Line-heights: `--kob-leading-tight | -normal | -relaxed` (1.2 / 1.5 / 1.7).
- Locale-aware: `html[dir="rtl"]` swaps display + sans to Noto Kufi Arabic.

### Spacing
4 px base scale: `--kob-space-1..8` (0.25 → 4 rem). Section gaps use
`--kob-space-5/6`, page padding uses `--kob-space-4` on mobile,
`--kob-space-6` on desktop.

### Containers
`--kob-container-sm|md|lg|xl` (40 / 56 / 72 / 88 rem).

### Shape & elevation
- Radius: `--kob-radius-xs..xl` + `--kob-radius-pill`.
- Shadow: `--kob-shadow-sm|md|lg`.
- Focus: `--kob-focus-ring` (3 px gold halo, applied globally to
  every focusable element via `:focus-visible`).

## 2. Components (standardized)

All components are pre-existing skeuomorphic primitives now wired to
the unified tokens. Nothing duplicated per portal.

| Component | Location | Notes |
| --- | --- | --- |
| Button (default / ghost / destructive) | `.metric-card`, `.company-nav-*`, `.kob-auth-submit` | Uses `--btn-gradient`, `--kob-focus-ring` |
| Icon button | `.company-sidebar-collapse`, auth `password-toggle` | 40×40 min tap target |
| Input / Password / Search | `.kob-auth-input`, `.company-input` | Shared `--inset-input` well |
| Select / Checkbox / Radio / Textarea | shadcn primitives themed via `@theme inline` | ARIA via Radix |
| Form field | `.kob-auth-field`, `.company-field` | Label + hint + error slot |
| Card / Metric card | `src/components/common/MetricCard.tsx`, `.company-card` | Same shadow + radius tokens |
| Table / Data list | `.engraved` tables in admin + platform | Horizontal scroll wrapper on mobile |
| Badge / **Status badge** | `src/components/common/StatusBadge.tsx` (new) + `.kob-badge` | 5 tones: success / warning / error / info / neutral |
| Tabs / Dialog / Drawer / Tooltip / Dropdown | shadcn (Radix) — Radix already provides ARIA + keyboard |
| Pagination | `.company-pagination` | Shared across coupons / customers / orders |
| Skeleton / Empty state / Error state | `.kob-skeleton`, `.kob-empty`, `.kob-error-state` | Same tokens, consistent copy tone |
| Toast | `sonner` singleton in `__root.tsx` | Tone maps to status tokens |
| Page header / Section header | `src/components/common/PageHeader.tsx` | Eyebrow + title + description + action slot |
| Sidebar | `src/features/company/CompanySidebar.tsx` | Collapsible + mobile drawer |
| Top bar | `src/layouts/FloatingIsland.tsx` (platform / cashier) | Grouped items, dropdowns |
| Language switcher | `src/lib/i18n.tsx` → `<LanguageSwitcher />` | ar/en, persists to localStorage |
| User menu | Sign-out slot in sidebar + island | Same treatment across portals |

## 3. Removed duplicate styles

- Auth: removed per-portal color forks — `/auth` now consumes the
  same `--kob-gold` and `--kob-focus-ring` as admin pages.
- Badges: three ad-hoc badge classes (`admin-pill`, `cs-status-pill`,
  `platform-tag`) now map to the single `.kob-badge[data-tone]`
  utility. Legacy classes remain as thin aliases for now.
- Focus states: page-specific `:focus` overrides collapsed into one
  global `:focus-visible` rule using `--kob-focus-ring`.
- Motion: individual `prefers-reduced-motion` guards on animation
  utilities replaced by one global reduce-motion block.

## 4. Migrated pages

Wired to unified tokens and verified visually in RTL + LTR:

- `/auth` (unified sign-in + workspace selector).
- `/platform`, `/platform/companies`, `/platform/customer-success[/$caseId]`,
  `/platform/users`, `/platform/announcements`, `/platform/audit`,
  `/platform/settings`, `/platform/training`.
- `/admin` overview and every sub-route: `customers`, `subscriptions`,
  `orders`, `drinks`, `coupons`, `sell-coupon`, `plans`, `branches`,
  `cashiers`, `reports`, `customer-success[/$caseId]`, `settings`.
- `/cashier`, `/cashier/sell-coupon`.
- `/scan` public flow.

## 5. Responsive & accessibility

- Breakpoints via Tailwind (`sm | md | lg | xl | 2xl`). Sidebar becomes
  an off-canvas drawer under `md` (`.company-sidebar[data-mobile-open]`).
- Tables wrap in `.table-scroll` with sticky header on wide screens.
- Charts use Recharts `<ResponsiveContainer>` — no overflow.
- Touch targets ≥ 44 × 44 px on primary actions.
- RTL: `dir="rtl"` on `<html>` swaps fonts, mirrors sidebar chevrons,
  reverses `flex` where needed.
- Global `:focus-visible` ring, `prefers-reduced-motion` respected,
  every icon-only button carries `aria-label`, forms use associated
  `<label>` or `aria-label`.

## 6. Remaining legacy design areas

- Legacy status pill (`src/lib/ui.tsx` → `<StatusPill>`) still lives
  next to the new `<StatusBadge>` while feature files migrate. Safe
  to remove once every call site switches over.
- A handful of one-off inline `style={{...}}` blocks in
  `AuthLoadingScreen` and the customer-success workspace can move to
  tokens in a follow-up pass.
- `admin.financial-reports.tsx` retains bespoke chart colors; will
  be re-tokenized when the reports scope is revisited.

No database, RLS, or authorization changes. No new UI libraries
installed.