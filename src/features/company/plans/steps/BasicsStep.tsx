import type { PlanInput } from "@/services/company/plans.service";
import { BADGE_PRESETS, COLOR_SWATCHES, type BadgePreset } from "../types";
import { S } from "../strings";
import { Field, Toggle } from "../ui";

type Props = { lang: "ar" | "en"; value: PlanInput; onChange: (p: Partial<PlanInput>) => void };

const BADGE_LABEL: Record<BadgePreset, keyof typeof S> = {
  most_popular: "b_most_popular",
  best_value: "b_best_value",
  new: "b_new",
  limited: "b_limited",
  premium: "b_premium",
};

export default function BasicsStep({ lang, value, onChange }: Props) {
  return (
    <div className="pb-step">
      <div className="pb-grid-2">
        <Field label={S.name_ar[lang]}>
          <input
            className="pb-input"
            dir="rtl"
            value={value.name_ar}
            onChange={(e) => onChange({ name_ar: e.target.value })}
          />
        </Field>
        <Field label={S.name_en[lang]}>
          <input
            className="pb-input"
            dir="ltr"
            value={value.name_en}
            onChange={(e) => onChange({ name_en: e.target.value })}
          />
        </Field>
        <Field label={S.desc_ar[lang]}>
          <textarea
            className="pb-input pb-textarea"
            dir="rtl"
            rows={3}
            value={value.description_ar ?? ""}
            onChange={(e) => onChange({ description_ar: e.target.value })}
          />
        </Field>
        <Field label={S.desc_en[lang]}>
          <textarea
            className="pb-input pb-textarea"
            dir="ltr"
            rows={3}
            value={value.description_en ?? ""}
            onChange={(e) => onChange({ description_en: e.target.value })}
          />
        </Field>
      </div>

      <Field label={S.color[lang]}>
        <div className="pb-swatch-row">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange({ color: c })}
              className={`pb-swatch ${value.color === c ? "pb-swatch-active" : ""}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="pb-swatch-picker"
            aria-label="custom color"
          />
        </div>
      </Field>

      <Field label={S.badge[lang]}>
        <div className="pb-chip-row">
          <button
            type="button"
            className={`pb-chip ${!value.badge ? "pb-chip-active" : ""}`}
            onClick={() => onChange({ badge: null })}
          >
            {S.no_badge[lang]}
          </button>
          {BADGE_PRESETS.map((b) => (
            <button
              key={b}
              type="button"
              className={`pb-chip ${value.badge === b ? "pb-chip-active" : ""}`}
              onClick={() => onChange({ badge: b })}
            >
              {S[BADGE_LABEL[b]][lang]}
            </button>
          ))}
        </div>
      </Field>

      <div className="pb-grid-2">
        <div className="pb-stack">
          <Toggle
            label={S.active_label[lang]}
            checked={value.is_active}
            onChange={(v) => onChange({ is_active: v })}
          />
          <Toggle
            label={S.hidden_label[lang]}
            checked={value.is_hidden}
            onChange={(v) => onChange({ is_hidden: v })}
          />
        </div>
        <Field label={S.display_order[lang]}>
          <input
            type="number"
            className="pb-input"
            value={value.display_order}
            onChange={(e) => onChange({ display_order: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
    </div>
  );
}