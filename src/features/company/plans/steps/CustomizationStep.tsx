import type { PlanInput } from "@/services/company/plans.service";
import { S } from "../strings";
import { Field, Toggle } from "../ui";

export default function CustomizationStep({
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
      <div className="pb-stack">
        <Toggle
          label={S.allow_extra_shot[lang]}
          checked={value.allow_extra_shot}
          onChange={(v) => onChange({ allow_extra_shot: v })}
        />
        <Toggle
          label={S.allow_milk[lang]}
          checked={value.allow_milk}
          onChange={(v) => onChange({ allow_milk: v })}
        />
        <Toggle
          label={S.allow_syrup[lang]}
          checked={value.allow_syrup}
          onChange={(v) => onChange({ allow_syrup: v })}
        />
        <Toggle
          label={S.allow_sugar[lang]}
          checked={value.allow_sugar}
          onChange={(v) => onChange({ allow_sugar: v })}
        />
        <Toggle
          label={S.allow_comments[lang]}
          checked={value.allow_comments}
          onChange={(v) => onChange({ allow_comments: v })}
        />
      </div>
      <Field label={S.max_addons[lang]}>
        <input
          type="number"
          min={0}
          className="pb-input"
          placeholder="—"
          value={value.max_addons ?? ""}
          onChange={(e) =>
            onChange({ max_addons: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
      </Field>
    </div>
  );
}