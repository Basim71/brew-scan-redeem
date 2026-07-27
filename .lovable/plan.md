# Plan Builder — Schema Requirements & Implementation Plan

## Why this needs your approval first

The current `plans` table stores only: `name`, `duration_days`, `price`, `is_active`, `organization_id`. The wizard's 7 steps require ~40 new fields plus 3 join tables. The task rules say **STOP** and explain before writing migrations — so nothing is written until you confirm.

Everything else (UI, services, RLS, validation) can be built without your input once the schema is agreed.

---

## Required schema changes

### 1. `plans` table — new columns

| Field | Type | Why |
|---|---|---|
| `name_ar` / `name_en` | text | Step 1 asks for bilingual names. Current `name` is single-language. |
| `description_ar` / `description_en` | text nullable | Step 1 description fields. |
| `color` | text (hex) | Step 1 plan color badge. |
| `badge` | text nullable | Step 1 (Most Popular / New / etc.). |
| `is_hidden` | boolean | Step 1 visibility separate from `is_active`. |
| `display_order` | int | Step 1 ordering; drives card list order. |
| `currency` | text (3-char) | Step 2 — currently implicit from `organization_settings`; storing per-plan lets you override. |
| `auto_renewal` | boolean | Step 2. |
| `grace_period_days` | int nullable | Step 2. |
| `drinks_per_redemption` | int | Step 3. |
| `redemption_frequency` | text enum (`daily`,`every_2_days`,`every_3_days`,`weekly`,`custom`) | Step 3. |
| `redemption_frequency_days` | int nullable | Step 3 (custom value). |
| `max_redemptions_per_period` | int nullable (null = unlimited) | Step 3. |
| `max_drinks_per_day` | int | Step 3. Replaces the hardcoded "1 drink/day" rule. |
| `max_drinks_per_redemption` | int | Step 3. |
| `carry_unused` | boolean | Step 3. |
| `max_carry_days` | int nullable | Step 3 (only when carry enabled). |
| `redemption_window_start` / `redemption_window_end` | time nullable | Step 3. |
| `allowed_weekdays` | int[] (0–6) | Step 3. |
| `allow_extra_shot` / `allow_milk` / `allow_syrup` / `allow_sugar` / `allow_comments` | boolean | Step 6. |
| `max_addons` | int nullable | Step 6. |
| `archived_at` | timestamptz nullable | Enables card "Archive" action without hard delete. |

Kept for compatibility: `name` (mirrors `name_en` or `name_ar` fallback), `duration_days`, `price`, `is_active`.

### 2. New join table `plan_allowed_drinks`
```
plan_id uuid → plans, drink_type_id uuid → drink_types, organization_id uuid
```
Step 4. Empty rows for a plan = all drinks allowed.

### 3. New join table `plan_allowed_branches`
```
plan_id uuid → plans, branch_id uuid → branches, organization_id uuid,
mode text ('include' | 'exclude')
```
Step 5. Empty include rows = all branches allowed. Exclude rows subtract.

### 4. `plan_max_drink_selection` column on `plans`
`max_selectable_drinks int nullable` — Step 4 optional cap on how many drinks a customer can pick from allowed set.

### 5. RLS
Both join tables get the same organization-scoped policies as `plans` (SELECT/INSERT/UPDATE/DELETE via `is_organization_member(organization_id)` and manager-role check for writes). GRANTs to `authenticated` + `service_role`.

### 6. Server-side validation
Add a Postgres function `validate_plan_consumption(_plan_id uuid)` invoked in a `BEFORE INSERT/UPDATE` trigger to enforce:
- `max_drinks_per_day >= drinks_per_redemption`
- `max_drinks_per_redemption >= 1`
- `max_carry_days` NULL unless `carry_unused = true`
- `duration_days > 0`, `price >= 0`
- `redemption_frequency_days` set iff frequency = 'custom'
- Unique `(organization_id, name_ar)` and `(organization_id, name_en)`

---

## What I will NOT touch

- `subscriptions`, `orders`, `scan_submit_order` — consumption at redemption time still runs against `plans.duration_days`; the new fields are additive metadata that new redemption logic can consume later. Existing subscriptions keep working.
- `subscriptions` schema.
- Cashier scan flow.
- Any other portal.

---

## Implementation once schema is approved

### Files to create
- `src/services/company/plans.service.ts` — extend with typed CRUD for new columns + join tables (batched inserts, one round-trip per save).
- `src/features/company/plans/PlanBuilder.tsx` — wizard shell with 7 steps, stepper, keyboard nav, unsaved-changes guard.
- `src/features/company/plans/steps/{Basics,Pricing,Consumption,Drinks,Branches,Customization,Review}.tsx`.
- `src/features/company/plans/PlanCard.tsx` — premium card for the list.
- `src/features/company/plans/PlanPreviewDialog.tsx` — customer-view preview.
- `src/features/company/plans/validation.ts` — Zod schemas mirroring server rules; runs before submit + inline field errors.
- `PLAN_BUILDER_REPORT.md`.

### Files to modify
- `src/routes/admin.plans.tsx` — replace inline modal form with `PlanBuilder`; render card grid.
- `src/styles.css` — add plan-builder tokens (only if existing KOB tokens don't cover the wizard stepper / color-swatch UI).

### Wizard mechanics
- Local `useReducer` state; step validation gates "Next".
- Draft persisted in `sessionStorage` so accidental navigation doesn't lose work.
- Review step shows the same `PlanPreviewDialog` component the list uses.
- Save = one transaction: upsert plan row, replace join rows.

### List page
- Cards show badge, bilingual name (per current `useI18n` lang), price+currency, duration, drinks/redemption + frequency, allowed-drinks count, branch count, status, order.
- Actions: Edit (opens wizard prefilled), Duplicate (opens wizard with cloned draft, name suffixed "(copy)"), Archive (sets `archived_at`), Delete (hard delete only if no subscriptions reference it — server checks), Preview.
- Sort by `display_order`; drag-reorder deferred (out of scope).

### Security
- All reads/writes go through the browser client under RLS; `organization_id` set from `useOrganization()` on every insert.
- Server trigger enforces validation and unique names regardless of client bypass attempts.
- No `supabaseAdmin`.

### i18n & design
- All new strings added to `src/lib/i18n.tsx` in both `ar` and `en`.
- KOB premium light tokens (warm white, cream, espresso, gold) — reuse existing `company-*` classes; no new palette.
- RTL verified via `dir` on wizard root.

---

## Ask

Reply **"approved"** to run the single migration and build the wizard, or tell me which fields to drop/rename first. Nothing is written to the database or codebase until you approve.