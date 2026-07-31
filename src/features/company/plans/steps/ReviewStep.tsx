import type { PlanInput } from "@/services/company/plans.service";
import type { DrinkTypeRow } from "@/services/company/drinks.service";
import type { BranchRow } from "@/services/company/branches.service";
import { S } from "../strings";
import { maxPossibleDrinks, totalValidityDays, validatePlan } from "../validation";

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
  const validity = totalValidityDays(value);
  const maxDrinks = maxPossibleDrinks(value);
  const allowedDrinks = value.allowed_drink_ids.length
    ? drinks.filter((d) => value.allowed_drink_ids.includes(d.id))
    : drinks;
  const allowedBranches = value.allowed_branch_ids.length
    ? branches.filter((b) => value.allowed_branch_ids.includes(b.id))
    : branches;

  return (
    <div className="ds-step">
      <p className="ds-hint">{S.review_hint[lang]}</p>
      <div className="ds-grid-2">
        <div className="pb-review-block">
          <div className="pb-section-label">{S.total_validity[lang]}</div>
          <div className="pb-review-metric">
            {validity}
            <span className="pb-dim"> {S.days[lang]}</span>
          </div>
        </div>
        <div className="pb-review-block">
          <div className="pb-section-label">{S.max_possible_drinks[lang]}</div>
          <div className="pb-review-metric">{maxDrinks}</div>
        </div>
      </div>
      <div className="ds-grid-2">
          <div className="pb-review-block">
            <div className="pb-section-label">{S.step_drinks[lang]}</div>
            <div className="pb-dim">
              {value.allowed_drink_ids.length === 0 ? S.all_drinks[lang] : allowedDrinks.length}
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
              {value.allowed_branch_ids.length === 0 ? S.all_branches[lang] : allowedBranches.length}
              <ul className="pb-review-list">
                {allowedBranches.slice(0, 6).map((b) => (
                  <li key={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</li>
                ))}
                {allowedBranches.length > 6 && <li>…</li>}
              </ul>
            </div>
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
  );
}