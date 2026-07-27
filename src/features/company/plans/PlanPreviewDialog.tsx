import type { Plan } from "@/services/company/plans.service";
import type { DrinkTypeRow } from "@/services/company/drinks.service";
import type { BranchRow } from "@/services/company/branches.service";
import { useI18n } from "@/lib/i18n";
import { S } from "./strings";
import { PlanCard } from "./PlanCard";

export function PlanPreviewDialog({
  plan,
  drinks,
  branches,
  onClose,
}: {
  plan: Plan;
  drinks: DrinkTypeRow[];
  branches: BranchRow[];
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const allowedDrinks = plan.allowed_drink_ids.length
    ? drinks.filter((d) => plan.allowed_drink_ids.includes(d.id))
    : drinks;
  const allowedBranches = plan.allowed_branch_ids.length
    ? branches.filter((b) => plan.allowed_branch_ids.includes(b.id))
    : branches.filter((b) => !plan.excluded_branch_ids.includes(b.id));
  return (
    <div className="pb-overlay" onClick={onClose}>
      <div className="pb-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pb-review-grid">
          <PlanCard plan={plan} lang={lang} preview />
          <div className="pb-review-side">
            <div className="pb-review-block">
              <div className="pb-section-label">{S.step_drinks[lang]}</div>
              <ul className="pb-review-list">
                {allowedDrinks.slice(0, 20).map((d) => (
                  <li key={d.id}>{lang === "ar" ? d.name_ar : d.name_en}</li>
                ))}
              </ul>
            </div>
            <div className="pb-review-block">
              <div className="pb-section-label">{S.step_branches[lang]}</div>
              <ul className="pb-review-list">
                {allowedBranches.slice(0, 20).map((b) => (
                  <li key={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="pb-dialog-footer">
          <button className="pb-btn-primary" onClick={onClose}>
            {S.cancel[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}