import type { PlanInput } from "@/services/company/plans.service";

export type ValidationIssue = { key: string; step: number };

export function validatePlan(p: PlanInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!p.name_ar.trim() || !p.name_en.trim()) issues.push({ key: "err_name_required", step: 0 });
  if (!Number.isFinite(p.duration_days) || p.duration_days <= 0) issues.push({ key: "err_duration", step: 1 });
  if (!Number.isFinite(p.price) || p.price < 0) issues.push({ key: "err_price", step: 1 });
  if (p.max_drinks_per_day < p.drinks_per_redemption) issues.push({ key: "err_max_daily_below", step: 2 });
  if (p.redemption_frequency === "custom" && (!p.redemption_frequency_days || p.redemption_frequency_days < 1))
    issues.push({ key: "err_freq_custom", step: 2 });
  if (p.carry_unused && (!p.max_carry_days || p.max_carry_days < 1))
    issues.push({ key: "err_carry_days", step: 2 });
  if (
    p.redemption_window_start &&
    p.redemption_window_end &&
    p.redemption_window_end <= p.redemption_window_start
  )
    issues.push({ key: "err_time_window", step: 2 });
  if (p.allowed_weekdays.length === 0) issues.push({ key: "err_no_weekdays", step: 2 });
  return issues;
}

export function estimateMonthlyDrinks(p: PlanInput): number {
  const freqDays =
    p.redemption_frequency === "daily"
      ? 1
      : p.redemption_frequency === "every_2_days"
        ? 2
        : p.redemption_frequency === "every_3_days"
          ? 3
          : p.redemption_frequency === "weekly"
            ? 7
            : Math.max(1, p.redemption_frequency_days ?? 1);
  const redemptions = Math.floor(30 / freqDays);
  const capped = p.max_redemptions_per_period
    ? Math.min(redemptions, p.max_redemptions_per_period)
    : redemptions;
  return capped * p.drinks_per_redemption;
}