import type { PlanInput } from "@/services/company/plans.service";

export type ValidationIssue = { key: string; step: number };

export function validatePlan(p: PlanInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!p.name_ar.trim() || !p.name_en.trim()) issues.push({ key: "err_name_required", step: 0 });
  if (!Number.isFinite(p.duration_days) || p.duration_days <= 0) issues.push({ key: "err_duration", step: 1 });
  if (!Number.isFinite(p.price) || p.price < 0) issues.push({ key: "err_price", step: 1 });
  if (!Number.isFinite(p.bonus_days) || p.bonus_days < 0) issues.push({ key: "err_bonus_days", step: 1 });
  if (
    p.redemption_window_start &&
    p.redemption_window_end &&
    p.redemption_window_end <= p.redemption_window_start
  )
    issues.push({ key: "err_time_window", step: 2 });
  return issues;
}

export function totalValidityDays(p: PlanInput): number {
  return Math.max(0, p.duration_days) + Math.max(0, p.bonus_days ?? 0);
}

export function maxPossibleDrinks(p: PlanInput): number {
  return totalValidityDays(p) * Math.max(1, p.max_drinks_per_day);
}