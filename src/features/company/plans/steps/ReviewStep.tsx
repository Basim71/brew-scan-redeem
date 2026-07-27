import type { PlanInput } from "@/services/company/plans.service";
import type { DrinkTypeRow } from "@/services/company/drinks.service";
import type { BranchRow } from "@/services/company/branches.service";
import { S } from "../strings";
import { estimateMonthlyDrinks, validatePlan } from "../validation";
import { PlanCard } from "../PlanCard";

export default function ReviewStep({
  lang,
  value,
  drinks,
  branches,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  drinks: DrinkTypeRow[];
  branches: BranchRow[];
}) {
  const issues = validatePlan(value);
  const monthly = estimateMonthlyDrinks(value);
  const allowedDrinks = value.allowed_drink_ids.length
    ? drinks.filter((d) => value.allowed_drink_ids.includes(d.id))
    : drinks;
  const allowedBranches = value.allowed_branch_ids.length
    ? branches.filter((b) => value.allowed_branch_ids.includes(b.id))
    : branches.filter((b) => !value.excluded_branch_ids.includes(b.id));

  return (
    <div className="pb-step">
      <p className="pb-hint">{S.review_hint[lang]}</p>
      <div className="pb-review-grid">
        <PlanCard
          lang={lang}
          plan={{
            ...value,
            id: "preview",
            name: value.name_en || value.name_ar,
            created_at: new Date().toISOString(),
            allowed_drink_ids: allowedDrinks.map((d) => d.id),
            allowed_branch_ids: allowedBranches.map((b) => b.id),
            excluded_branch_ids: value.excluded_branch_ids,
          }}
          preview
        />
        <div className="pb-review-side">
          <div className="pb-review-block">
            <div className="pb-section-label">{S.estimated_usage[lang]}</div>
            <div className="pb-review-metric">
              {monthly}
              <span className="pb-dim"> {S.drinks_per_month[lang]}</span>
            </div>
          </div>
          <div className="pb-review-block">
            <div className="pb-section-label">{S.step_drinks[lang]}</div>
            <div className="pb-dim">
              {allowedDrinks.length}
              <ul className="pb-review-list">
                {allowedDrinks.slice(0, 6).map((d) => (
                  <li key={d.id}>{lang === "ar" ? d.name_ar : d.name_en}</li>
                ))}
                {allowedDrinks.length > 6 && <li>…</li>}
              </ul>
            </div>
          </div>
          <div className="pb-review-block">
            <div className="pb-section-label">{S.step_branches[lang]}</div>
            <div className="pb-dim">
              {allowedBranches.length}
              <ul className="pb-review-list">
                {allowedBranches.slice(0, 6).map((b) => (
                  <li key={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</li>
                ))}
                {allowedBranches.length > 6 && <li>…</li>}
              </ul>
            </div>
          </div>
          {issues.length > 0 && (
            <div className="pb-warning-block">
              <div className="pb-section-label">{S.warnings[lang]}</div>
              <ul className="pb-warning-list">
                {issues.map((i, idx) => (
                  <li key={idx}>{S[i.key as keyof typeof S][lang]}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}