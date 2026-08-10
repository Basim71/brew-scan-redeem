# KOB — Phase 1: Global Design System Foundation

Foundation only. No schema, auth, RLS, permission, route, or business-logic changes.

## 1. Audit result (reused, not duplicated)
The existing library at `src/components/kob/` already covered most primitives, so it
was extended rather than replaced:

| Area | Existing | Phase 1 action |
| --- | --- | --- |
| Button / IconButton | `Button.tsx` (primary, secondary, ghost, danger, gold, loading, block, sizes) | reused |
| Form | `Field.tsx` (Input, Textarea, Select), `Inputs.tsx` (Search, Password, Phone, Number, Date, DateRange, MultiSelect, FileUpload, Otp), `Controls.tsx` (Checkbox, Radio, RadioGroup, Toggle) | reused + `DatePicker` / `DateRangePicker` / `Switch` canonical aliases |
| Cards | `Card.tsx`, `Layout.tsx` (Section, SectionHeader, SectionFooter, StatCard, InfoCard, WarningCard) | reused |
| Dialogs | `Modal.tsx`, `Dialogs.tsx` (Form, Information, Warning, Danger, FullScreen, SideDrawer) | reused + `Dialog` / `InfoDialog` / `Drawer` aliases |
| Feedback | `toast.ts` (sonner), `Skeleton.tsx`, `States.tsx` (Empty, Error, Loading, Retry, NoResults) | reused + **new `Alert`** |
| Table | `DataTable.tsx`, `Pagination.tsx` | reused |
| Nav / menus | `Tabs.tsx`, `Menu.tsx` (Dropdown, Tooltip), `FloatingIsland`, `CompanySidebar` | reused |
| Icons | `lucide-react` only | **new `Icon`** wrapper standardizing size/stroke/alignment |
| Typography | CSS-only | **new `Text`** primitive + variant scale |
| Localization | `src/lib/i18n.tsx` + `src/locales/{ar,en}.json` | extended with shared namespaces |

No duplicate component system was created; nothing was deleted.

## 2. Tokens (`src/styles.css`, additive layer)
Semantic aliases over the approved palette (#2B1A12, #5A3B22, #8A5E2B, #D4AF37, #F2E6C9):
`--kob-background`, `--kob-surface-elevated`, `--kob-surface-muted`, `--kob-surface-inverse`,
`--kob-border-strong|-subtle`, `--kob-text-primary|-secondary|-muted|-inverse|-on-primary`,
`--kob-primary|-hover|-active`, `--kob-accent-hover|-active`,
`--kob-success|-warning|-error|-info`, `--kob-focus`, `--kob-disabled-bg|-text`.

Also centralized: spacing (`--kob-space-1..8`), radii (`--kob-radius-xs..xl`, pill),
shadows (`--kob-shadow-sm|md|lg`, `--kob-focus-ring`), motion
(`--kob-duration-fast|base|slow`, `--kob-ease`, `--kob-transition`), z-index layers
(`--kob-z-base|raised|sticky|nav|dropdown|drawer|modal|toast|tooltip`), and the
type scale (`--kob-text-display|h1..h4|body|body-sm|caption|label|button|nav|table`).
Selected tokens are exposed as Tailwind v4 utilities through `@theme inline`.

## 3. Typography
`<Text variant="display|h1|h2|h3|h4|body|bodySm|caption|label|button|nav|table">`
with `tone`, `align`, `numeric`, `truncate`, and semantic default tags, plus
`Display/Heading1..4/Body/BodySmall/Caption` shortcuts. Display font follows
Montserrat (LTR) / Tajawal (RTL) automatically.

## 4. RTL / LTR, responsive, a11y, motion
New CSS uses logical properties (`border-inline-start`, `margin-inline-start`,
`padding-inline`), so Arabic RTL needs no separate components. Global
`:focus-visible` gold ring, ARIA roles on Alert, keyboard/Escape handling and
focus restore in Modal/Dialogs, `prefers-reduced-motion` honored globally.
Motion primitives: `kob-fade-in`, `kob-rise-in`, `kob-slide-in-end`.

## 5. Localization
`common.actions.*`, `common.labels.*`, `common.status.*`, `common.errors.*`,
`common.success.*`, `common.empty.*`, `common.navigation.*` now exist in both
`src/locales/en.json` and `src/locales/ar.json`. Existing keys were preserved
(merge, never overwrite). Page-level text migration is Phase 2.

## 6. Validation
`tsgo --noEmit` clean; dev server and compiled stylesheet verified.
