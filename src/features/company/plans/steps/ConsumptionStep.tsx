import type { PlanInput } from "@/services/company/plans.service";
import { S } from "../strings";

export default function ConsumptionStep({
  lang,
  value,
  onChange,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  onChange: (p: Partial<PlanInput>) => void;
}) {
  const custom = !!value.redemption_window_start || !!value.redemption_window_end;

  function setDailyLimit(n: number) {
    onChange({
      max_drinks_per_day: n,
      drinks_per_redemption: n,
      max_drinks_per_redemption: n,
    });
  }

  return (
    <div className="ds-step">
      <div className="ds-field">
        <span>{S.daily_limit[lang]}</span>
        <div className="ds-pills">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="ds-pill"
              data-active={value.max_drinks_per_day === n}
              onClick={() => setDailyLimit(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="ds-hint">{S.daily_limit_hint[lang]}</p>
      </div>

      <div className="ds-field">
        <span>{S.availability[lang]}</span>
        <div className="ds-pills">
          <button
            type="button"
            className="ds-pill"
            data-active={!custom}
            onClick={() => onChange({ redemption_window_start: null, redemption_window_end: null })}
          >
            {S.all_day[lang]}
          </button>
          <button
            type="button"
            className="ds-pill"
            data-active={custom}
            onClick={() =>
              onChange({
                redemption_window_start: value.redemption_window_start ?? "07:00",
                redemption_window_end: value.redemption_window_end ?? "22:00",
              })
            }
          >
            {S.custom_window[lang]}
          </button>
        </div>
      </div>

      {custom && (
        <div className="ds-grid-2">
          <label className="ds-field">
            <span>{S.time_start[lang]}</span>
            <input
              type="time"
              className="pb-input"
              value={value.redemption_window_start ?? ""}
              onChange={(e) => onChange({ redemption_window_start: e.target.value || null })}
            />
          </label>
          <label className="ds-field">
            <span>{S.time_end[lang]}</span>
            <input
              type="time"
              className="pb-input"
              value={value.redemption_window_end ?? ""}
              onChange={(e) => onChange({ redemption_window_end: e.target.value || null })}
            />
          </label>
        </div>
      )}

      <div className="pb-review-block">
        <div className="pb-section-label">{S.policy_title[lang]}</div>
        <p className="ds-hint">{S.policy_text[lang]}</p>
      </div>
    </div>
  );
}