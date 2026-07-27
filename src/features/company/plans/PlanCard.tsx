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
  onEdit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onPreview,
  onToggleActive,
  drinkCount,
  branchCount,
}: {
  plan: Plan;
  lang?: "ar" | "en";
  preview?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  onToggleActive?: () => void;
  drinkCount?: number;
  branchCount?: number;
}) {
  const i = useI18n();
  const l = lang ?? i.lang;
  const displayName = l === "ar" ? plan.name_ar : plan.name_en;
  const displayDesc = l === "ar" ? plan.description_ar : plan.description_en;
  const isArchived = !!plan.archived_at;

  return (
    <article className="pb-card" style={{ borderTopColor: plan.color }}>
      <header className="pb-card-head">
        <div className="pb-card-top">
          {plan.badge && (
            <span className="pb-card-badge" style={{ background: plan.color }}>
              {S[BADGE_LABEL[plan.badge]]?.[l] ?? plan.badge}
            </span>
          )}
          <span className={`pb-card-status ${plan.is_active ? "on" : "off"}`}>
            {plan.is_active ? S.active_label[l] : S.disabled[l]}
            {isArchived && ` · ${S.archive[l]}`}
          </span>
        </div>
        <h3 className="pb-card-name">{displayName}</h3>
        {displayDesc && <p className="pb-card-desc">{displayDesc}</p>}
      </header>

      <div className="pb-card-price">
        <span className="pb-card-amount">
          {Number(plan.price).toLocaleString(l === "ar" ? "ar-SA" : "en-US")}
        </span>
        <span className="pb-card-currency">{plan.currency}</span>
        <span className="pb-card-per">
          / {plan.duration_days} {S.days[l]}
        </span>
      </div>

      <ul className="pb-card-facts">
        <li>
          <b>{plan.drinks_per_redemption}</b> {S.drinks_per_redemption[l]}
        </li>
        <li>{S[FREQ_LABEL[plan.redemption_frequency]][l]}</li>
        <li>
          <b>{drinkCount ?? (plan.allowed_drink_ids.length || "∞")}</b> {S.step_drinks[l]}
        </li>
        <li>
          <b>{branchCount ?? (plan.allowed_branch_ids.length || "∞")}</b> {S.step_branches[l]}
        </li>
      </ul>

      {!preview && (
        <footer className="pb-card-actions">
          <button className="pb-btn-ghost" onClick={onPreview}>
            {S.preview[l]}
          </button>
          <button className="pb-btn-ghost" onClick={onEdit}>
            {S.edit[l]}
          </button>
          <button className="pb-btn-ghost" onClick={onDuplicate}>
            {S.duplicate[l]}
          </button>
          <button className="pb-btn-ghost" onClick={onToggleActive}>
            {plan.is_active ? S.disabled[l] : S.active_label[l]}
          </button>
          {isArchived ? (
            <button className="pb-btn-ghost" onClick={onUnarchive}>
              {S.unarchive[l]}
            </button>
          ) : (
            <button className="pb-btn-ghost" onClick={onArchive}>
              {S.archive[l]}
            </button>
          )}
          <button className="pb-btn-danger" onClick={onDelete}>
            {S.del[l]}
          </button>
        </footer>
      )}
    </article>
  );
}