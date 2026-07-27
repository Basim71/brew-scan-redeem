import { useMemo, useState } from "react";
import type { PlanInput } from "@/services/company/plans.service";
import type { DrinkTypeRow } from "@/services/company/drinks.service";
import { S } from "../strings";
import { Field } from "../ui";

export default function DrinksStep({
  lang,
  value,
  onChange,
  drinks,
}: {
  lang: "ar" | "en";
  value: PlanInput;
  onChange: (p: Partial<PlanInput>) => void;
  drinks: DrinkTypeRow[];
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return drinks;
    return drinks.filter(
      (d) => d.name_ar.toLowerCase().includes(s) || d.name_en.toLowerCase().includes(s),
    );
  }, [drinks, q]);

  const allSelected = drinks.length > 0 && value.allowed_drink_ids.length === drinks.length;

  function toggle(id: string) {
    onChange({
      allowed_drink_ids: value.allowed_drink_ids.includes(id)
        ? value.allowed_drink_ids.filter((x) => x !== id)
        : [...value.allowed_drink_ids, id],
    });
  }

  return (
    <div className="pb-step">
      <p className="pb-hint">{S.drinks_hint[lang]}</p>
      <div className="pb-toolbar">
        <input
          className="pb-input"
          placeholder={S.search[lang]}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          className="pb-btn-ghost"
          onClick={() =>
            onChange({ allowed_drink_ids: allSelected ? [] : drinks.map((d) => d.id) })
          }
        >
          {allSelected ? S.clear[lang] : S.select_all[lang]}
        </button>
      </div>
      <div className="pb-drink-grid">
        {filtered.map((d) => {
          const on = value.allowed_drink_ids.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              className={`pb-drink-tile ${on ? "pb-drink-tile-active" : ""}`}
              onClick={() => toggle(d.id)}
            >
              <div
                className="pb-drink-thumb"
                style={{ backgroundImage: d.image_url ? `url(${d.image_url})` : undefined }}
              />
              <div className="pb-drink-name">{lang === "ar" ? d.name_ar : d.name_en}</div>
            </button>
          );
        })}
      </div>

      <Field label={S.max_selectable[lang]}>
        <input
          type="number"
          min={1}
          className="pb-input"
          placeholder="—"
          value={value.max_selectable_drinks ?? ""}
          onChange={(e) =>
            onChange({
              max_selectable_drinks: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </Field>
    </div>
  );
}