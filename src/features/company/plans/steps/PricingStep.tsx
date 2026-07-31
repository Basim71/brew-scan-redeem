import type { PlanInput } from "@/services/company/plans.service";
import { S } from "../strings";
import { totalValidityDays } from "../validation";

const DURATIONS = [30, 60, 90, 180, 365];
const BONUS = [0, 7, 14, 30];

export default function PricingStep({
  lang,
  value,
  onChange,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  onChange: (p: Partial<PlanInput>) => void;
}) {
  const total = totalValidityDays(value);
  return (
    <div className="ds-step">
      <div className="ds-grid-2">
        <label className="ds-field">
          <span>{S.price[lang]}</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="pb-input"
            value={value.price}
            onChange={(e) => onChange({ price: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="ds-field">
          <span>{S.currency[lang]}</span>
          <input
            className="pb-input"
            value={value.currency}
            onChange={(e) => onChange({ currency: e.target.value.toUpperCase().slice(0, 4) })}
          />
        </label>
      </div>

      <div className="ds-field">
        <span>{S.duration[lang]}</span>
        <div className="ds-pills">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className="ds-pill"
              data-active={value.duration_days === d}
              onClick={() => onChange({ duration_days: d })}
            >
              {d} {S.days[lang]}
            </button>
          ))}
          <input
            type="number"
            min={1}
            className="pb-input pb-input-tight"
            value={value.duration_days}
            onChange={(e) => onChange({ duration_days: Number(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div className="ds-field">
        <span>{S.bonus_days[lang]}</span>
        <div className="ds-pills">
          {BONUS.map((d) => (
            <button
              key={d}
              type="button"
              className="ds-pill"
              data-active={value.bonus_days === d}
              onClick={() => onChange({ bonus_days: d })}
            >
              {d === 0 ? (lang === "ar" ? "بدون" : "None") : `+${d}`}
            </button>
          ))}
          <input
            type="number"
            min={0}
            className="pb-input pb-input-tight"
            value={value.bonus_days}
            onChange={(e) => onChange({ bonus_days: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      </div>

      <div className="pb-review-block">
        <div className="pb-section-label">{S.total_validity[lang]}</div>
        <div className="pb-review-metric">
          {total}
          <span className="pb-dim"> {S.days[lang]}</span>
        </div>
        <p className="ds-hint">
          {value.duration_days} + {value.bonus_days} {S.days[lang]}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange({ auto_renewal: !value.auto_renewal })}
        className={`pb-toggle ${value.auto_renewal ? "pb-toggle-on" : ""}`}
        aria-pressed={value.auto_renewal}
      >
        <div className="pb-toggle-label">{S.auto_renewal[lang]}</div>
        <span className="pb-toggle-track">
          <span className="pb-toggle-thumb" />
        </span>
      </button>
    </div>
  );
}