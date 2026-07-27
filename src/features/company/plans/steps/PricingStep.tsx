import type { PlanInput } from "@/services/company/plans.service";
import { S } from "../strings";
import { Field, Toggle } from "../ui";

const DURATIONS = [30, 60, 90, 180, 365];

export default function PricingStep({
  lang,
  value,
  onChange,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  onChange: (p: Partial<PlanInput>) => void;
}) {
  const isCustomDuration = !DURATIONS.includes(value.duration_days);
  return (
    <div className="pb-step">
      <div className="pb-grid-2">
        <Field label={S.price[lang]}>
          <input
            type="number"
            min={0}
            step="0.01"
            className="pb-input"
            value={value.price}
            onChange={(e) => onChange({ price: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label={S.currency[lang]}>
          <input
            className="pb-input"
            value={value.currency}
            onChange={(e) => onChange({ currency: e.target.value.toUpperCase().slice(0, 4) })}
          />
        </Field>
      </div>

      <Field label={S.duration[lang]}>
        <div className="pb-chip-row">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`pb-chip ${!isCustomDuration && value.duration_days === d ? "pb-chip-active" : ""}`}
              onClick={() => onChange({ duration_days: d })}
            >
              {d} {S.days[lang]}
            </button>
          ))}
          <button
            type="button"
            className={`pb-chip ${isCustomDuration ? "pb-chip-active" : ""}`}
            onClick={() => onChange({ duration_days: value.duration_days || 30 })}
          >
            {S.duration_custom[lang]}
          </button>
          <input
            type="number"
            min={1}
            className="pb-input pb-input-tight"
            value={value.duration_days}
            onChange={(e) => onChange({ duration_days: Number(e.target.value) || 1 })}
          />
        </div>
      </Field>

      <Toggle
        label={S.auto_renewal[lang]}
        checked={value.auto_renewal}
        onChange={(v) => onChange({ auto_renewal: v })}
      />

      <Field label={S.grace_period[lang]}>
        <input
          type="number"
          min={0}
          className="pb-input"
          placeholder="—"
          value={value.grace_period_days ?? ""}
          onChange={(e) =>
            onChange({
              grace_period_days: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </Field>
    </div>
  );
}