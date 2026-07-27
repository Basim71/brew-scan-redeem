import type { PlanInput, RedemptionFrequency } from "@/services/company/plans.service";
import { S, WEEKDAY_LABELS } from "../strings";
import { Field, Toggle, NumberQuick } from "../ui";

const FREQ_LABEL: Record<RedemptionFrequency, keyof typeof S> = {
  daily: "freq_daily",
  every_2_days: "freq_every_2_days",
  every_3_days: "freq_every_3_days",
  weekly: "freq_weekly",
  custom: "freq_custom",
};

export default function ConsumptionStep({
  lang,
  value,
  onChange,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  onChange: (p: Partial<PlanInput>) => void;
}) {
  return (
    <div className="pb-step">
      <Field label={S.drinks_per_redemption[lang]}>
        <NumberQuick
          options={[1, 2, 3, 4, 5]}
          value={value.drinks_per_redemption}
          onChange={(v) => onChange({ drinks_per_redemption: v ?? 1 })}
          min={1}
        />
      </Field>

      <Field label={S.redemption_frequency[lang]}>
        <div className="pb-chip-row">
          {(Object.keys(FREQ_LABEL) as RedemptionFrequency[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`pb-chip ${value.redemption_frequency === f ? "pb-chip-active" : ""}`}
              onClick={() =>
                onChange({
                  redemption_frequency: f,
                  redemption_frequency_days:
                    f === "custom" ? (value.redemption_frequency_days ?? 4) : null,
                })
              }
            >
              {S[FREQ_LABEL[f]][lang]}
            </button>
          ))}
        </div>
      </Field>

      {value.redemption_frequency === "custom" && (
        <Field label={S.freq_custom_days[lang]}>
          <input
            type="number"
            min={1}
            className="pb-input"
            value={value.redemption_frequency_days ?? ""}
            onChange={(e) =>
              onChange({ redemption_frequency_days: Number(e.target.value) || 1 })
            }
          />
        </Field>
      )}

      <Field label={S.max_redemptions_per_period[lang]}>
        <NumberQuick
          options={[30, 60, 90]}
          value={value.max_redemptions_per_period}
          onChange={(v) => onChange({ max_redemptions_per_period: v })}
          allowUnlimited
          unlimitedLabel={S.unlimited[lang]}
          min={1}
        />
      </Field>

      <div className="pb-grid-2">
        <Field label={S.max_drinks_per_day[lang]}>
          <NumberQuick
            options={[1, 2, 3, 5]}
            value={value.max_drinks_per_day}
            onChange={(v) => onChange({ max_drinks_per_day: v ?? 1 })}
            min={1}
          />
        </Field>
        <Field label={S.max_drinks_per_redemption[lang]}>
          <NumberQuick
            options={[1, 2, 3]}
            value={value.max_drinks_per_redemption}
            onChange={(v) => onChange({ max_drinks_per_redemption: v ?? 1 })}
            min={1}
          />
        </Field>
      </div>

      <Toggle
        label={S.carry_unused[lang]}
        checked={value.carry_unused}
        onChange={(v) =>
          onChange({
            carry_unused: v,
            max_carry_days: v ? (value.max_carry_days ?? 7) : null,
          })
        }
      />
      {value.carry_unused && (
        <Field label={S.max_carry_days[lang]}>
          <input
            type="number"
            min={1}
            className="pb-input"
            value={value.max_carry_days ?? ""}
            onChange={(e) => onChange({ max_carry_days: Number(e.target.value) || 1 })}
          />
        </Field>
      )}

      <Field label={S.time_window[lang]}>
        <div className="pb-time-row">
          <input
            type="time"
            className="pb-input"
            value={value.redemption_window_start ?? ""}
            onChange={(e) => onChange({ redemption_window_start: e.target.value || null })}
          />
          <span className="pb-dim">
            {S.time_start[lang]} → {S.time_end[lang]}
          </span>
          <input
            type="time"
            className="pb-input"
            value={value.redemption_window_end ?? ""}
            onChange={(e) => onChange({ redemption_window_end: e.target.value || null })}
          />
        </div>
      </Field>

      <Field label={S.allowed_weekdays[lang]}>
        <div className="pb-chip-row">
          {WEEKDAY_LABELS.map((wd, i) => {
            const on = value.allowed_weekdays.includes(i);
            return (
              <button
                key={i}
                type="button"
                className={`pb-chip ${on ? "pb-chip-active" : ""}`}
                onClick={() => {
                  const next = on
                    ? value.allowed_weekdays.filter((d) => d !== i)
                    : [...value.allowed_weekdays, i].sort();
                  onChange({ allowed_weekdays: next });
                }}
              >
                {wd[lang]}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}