import type { PlanInput } from "@/services/company/plans.service";

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export const STEPS: WizardStep[] = [0, 1, 2, 3, 4, 5];

export const BADGE_PRESETS = ["most_popular", "best_value", "new", "limited", "premium"] as const;
export type BadgePreset = (typeof BADGE_PRESETS)[number];

export const COLOR_SWATCHES = [
  "#B8873A",
  "#8B5A2B",
  "#3B2F2F",
  "#556B2F",
  "#0F5F5C",
  "#4B3F72",
  "#8B1A1A",
  "#D4A017",
];

export function emptyDraft(defaultCurrency = "SAR"): PlanInput {
  return {
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    color: COLOR_SWATCHES[0],
    badge: null,
    is_active: true,
    is_hidden: false,
    display_order: 0,
    duration_days: 30,
    price: 0,
    currency: defaultCurrency,
    auto_renewal: false,
    bonus_days: 0,
    drinks_per_redemption: 1,
    redemption_frequency: "daily",
    redemption_frequency_days: null,
    max_redemptions_per_period: null,
    max_drinks_per_day: 1,
    max_drinks_per_redemption: 1,
    carry_unused: false,
    max_carry_days: null,
    redemption_window_start: null,
    redemption_window_end: null,
    allowed_weekdays: [0, 1, 2, 3, 4, 5, 6],
    max_selectable_drinks: null,
    allow_extra_shot: true,
    allow_milk: true,
    allow_syrup: true,
    allow_sugar: true,
    allow_comments: true,
    max_addons: null,
    archived_at: null,
    allowed_drink_ids: [],
    allowed_branch_ids: [],
    excluded_branch_ids: [],
  };
}