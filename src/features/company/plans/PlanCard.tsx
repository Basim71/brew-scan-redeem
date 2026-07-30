import { useI18n } from "@/lib/i18n";
import type { Plan, RedemptionFrequency } from "@/services/company/plans.service";
import { S } from "./strings";

const FREQ_LABEL: Record<RedemptionFrequency, keyof typeof S> = {
  daily: "freq_daily",
  every_2_days: "freq_every_2_days",
  every_3_days: "freq_every_3_days",
  weekly: "freq_weekly",
  custom: "freq_custom",
};
const BADGE_LABEL: Record<string, keyof typeof S> = {
  most_popular: "b_most_popular",
  best_value: "b_best_value",
  new: "b_new",
  limited: "b_limited",
  premium: "b_premium",
};

export function PlanCard({
  plan,
  lang,
  preview,
  onClick,
  drinkCount,
  branchCount,
}: {
  plan: Plan;
  lang?: "ar" | "en";
  preview?: boolean;
  onClick?: () => void;
  drinkCount?: number;
  branchCount?: number;
}) {
  const i = useI18n();
  const l = lang ?? i.lang;
  const displayName = (l === "ar" ? plan.name_ar : plan.name_en) || plan.name;
  const displayDesc = l === "ar" ? plan.description_ar : plan.description_en;
  const isArchived = !!plan.archived_at;
  const interactive = !preview && !!onClick;

  return (
    <article
      className={`pb-card ${interactive ? "pb-card-interactive" : ""}`}
      style={{ borderTopColor: plan.color }}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${S.edit[l]}: ${displayName}` : undefined}
    >
      <header className="pb-card-head">
        <div className="pb-card-top">
          <span className={`pb-card-status ${plan.is_active ? "on" : "off"}`}>
            <span className="pb-card-status-dot" aria-hidden="true" />
            {plan.is_active ? S.active_label[l] : S.disabled[l]}
            {isArchived && ` · ${S.archive[l]}`}
          </span>
          {plan.badge && (
            <span className="pb-card-badge" style={{ background: plan.color }}>
              {S[BADGE_LABEL[plan.badge]]?.[l] ?? plan.badge}
            </span>
          )}
        </div>
        <h3 className="pb-card-name">{displayName}</h3>
        {displayDesc && <p className="pb-card-desc">{displayDesc}</p>}
      </header>

      <div className="pb-card-price">
        <span className="pb-card-amount">{Number(plan.price).toLocaleString(l === "ar" ? "ar-SA" : "en-US")}</span>
        <span className="pb-card-currency">{plan.currency}</span>
        <span className="pb-card-per">
          / {plan.duration_days} {S.days[l]}
        </span>
      </div>

      <div className="pb-card-facts" aria-label={l === "ar" ? "تفاصيل الخطة" : "Plan details"}>
        <span className="pb-card-fact">
          <b>{plan.drinks_per_redemption}</b> {S.drinks_per_redemption[l]}
        </span>
        <span className="pb-card-fact">{S[FREQ_LABEL[plan.redemption_frequency]][l]}</span>
        <span className="pb-card-fact">
          <b>{drinkCount ?? (plan.allowed_drink_ids.length || "∞")}</b> {S.step_drinks[l]}
        </span>
        <span className="pb-card-fact">
          <b>{branchCount ?? (plan.allowed_branch_ids.length || "∞")}</b> {S.step_branches[l]}
        </span>
      </div>

      {interactive && (
        <div className="pb-card-open-hint" aria-hidden="true">
          <span>{l === "ar" ? "اضغط للتعديل" : "Click to edit"}</span>
          <span className="pb-card-arrow">{l === "ar" ? "←" : "→"}</span>
        </div>
      )}
    </article>
  );
}
