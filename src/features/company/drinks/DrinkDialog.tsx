import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { CafeDialog } from "@/features/company/cafe/ui";
import {
  ALLERGEN_CARDS,
  DRINK_CATEGORIES,
  GROUP_TEMPLATES,
  emptyDraft,
  newKey,
} from "./constants";
import { saveDrinkDraft, uploadDrinkImage } from "./service";
import type { DrinkDraft, GroupDraft } from "./types";

const CHOICE_KEYS = [
  "milk",
  "sugar",
  "extra_shot",
  "syrup",
  "temperature",
  "size",
] as const;

export function DrinkDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial?: DrinkDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [draft, setDraft] = useState<DrinkDraft>(initial ?? emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState(
    Boolean(initial?.calories || initial?.allergens.length),
  );

  const activeKeys = useMemo(
    () => new Set(draft.groups.map((group) => group.key)),
    [draft.groups],
  );

  function toggleTemplate(key: string) {
    const template = GROUP_TEMPLATES.find((item) => item.key === key);
    if (!template) return;
    setDraft((current) => {
      const existing = current.groups.find(
        (group) => group.name_en === template.build().name_en,
      );
      if (existing)
        return {
          ...current,
          groups: current.groups.filter((group) => group.key !== existing.key),
        };
      return { ...current, groups: [...current.groups, template.build()] };
    });
  }

  function addCustom() {
    const template = GROUP_TEMPLATES.find((item) => item.key === "custom");
    const built =
      template?.build() ??
      ({
        key: newKey(),
        name_en: "",
        name_ar: "",
        selection_type: "single",
        is_required: false,
        is_enabled: true,
        options: [],
      } as GroupDraft);
    const name = window.prompt(t("cafe.drinks.customPrompt"))?.trim();
    if (!name) return;
    setDraft((current) => ({
      ...current,
      groups: [
        ...current.groups,
        { ...built, key: newKey(), name_en: name, name_ar: name },
      ],
    }));
  }

  async function onFile(file: File) {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError(t("cafe.drinks.imageError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadDrinkImage(file);
      setDraft((current) => ({
        ...current,
        image_url: uploaded.url,
        image_path: uploaded.path,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.drinks.imageError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft.name_ar.trim() || !draft.name_en.trim()) {
      setError(t("cafe.drinks.namesRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDrinkDraft({ ...draft, is_active: true }, true);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.drinks.saveError"),
      );
      setBusy(false);
    }
  }

  const titleName = draft.name_ar.trim() || t("cafe.drinks.example");

  return (
    <CafeDialog
      title={
        initial?.id ? t("cafe.drinks.editTitle") : t("cafe.drinks.newTitle")
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-btn ghost" onClick={onClose}>
            {t("cafe.cancel")}
          </button>
          <button
            type="button"
            className="cafe-btn"
            disabled={busy}
            onClick={() => void save()}
          >
            {t("cafe.drinks.publish")}
          </button>
        </>
      }
    >
      <div>
        {error ? <div className="cafe-error">{error}</div> : null}
        <div className="cafe-two">
          <label>
            <span className="cafe-label">{t("cafe.drinks.nameAr")}</span>
            <input
              className="cafe-input"
              value={draft.name_ar}
              onChange={(event) =>
                setDraft({ ...draft, name_ar: event.target.value })
              }
              placeholder={t("cafe.drinks.example")}
            />
          </label>
          <label>
            <span className="cafe-label">{t("cafe.drinks.nameEn")}</span>
            <input
              className="cafe-input"
              dir="ltr"
              value={draft.name_en}
              onChange={(event) =>
                setDraft({ ...draft, name_en: event.target.value })
              }
              placeholder="Spanish Latte"
            />
          </label>
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="cafe-label">{t("cafe.drinks.kind")}</span>
          <div className="cafe-chips">
            {DRINK_CATEGORIES.map((category) => (
              <button
                key={category.key}
                type="button"
                className={
                  draft.category === category.key
                    ? "cafe-chip mini on"
                    : "cafe-chip mini"
                }
                onClick={() => setDraft({ ...draft, category: category.key })}
              >
                {t(`cafe.drinks.cat.${category.key}`)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="cafe-label">{t("cafe.drinks.choices")}</span>
          <div className="cafe-chips">
            {CHOICE_KEYS.map((key) => {
              const template = GROUP_TEMPLATES.find((item) => item.key === key);
              const on = draft.groups.some(
                (group) => group.name_en === template?.build().name_en,
              );
              return (
                <button
                  key={key}
                  type="button"
                  className={on ? "cafe-chip mini on" : "cafe-chip mini"}
                  onClick={() => toggleTemplate(key)}
                >
                  {isAr ? template?.label_ar : template?.label_en}
                </button>
              );
            })}
            <button
              type="button"
              className="cafe-chip mini"
              onClick={addCustom}
            >
              {t("cafe.drinks.another")}
            </button>
          </div>
        </div>
        <button
          type="button"
          className="cafe-more"
          style={{ marginTop: 14 }}
          onClick={() => setExtra((value) => !value)}
        >
          {t("cafe.drinks.optional")}
        </button>
        {extra ? (
          <div style={{ marginTop: 12 }}>
            <label>
              <span className="cafe-label">{t("cafe.drinks.calories")}</span>
              <input
                className="cafe-input"
                inputMode="numeric"
                value={draft.calories}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    calories: event.target.value.replace(/[^\d]/g, ""),
                  })
                }
              />
            </label>
            <div className="cafe-chips" style={{ marginTop: 10 }}>
              {ALLERGEN_CARDS.map((item) => {
                const on = draft.allergens.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={on ? "cafe-chip mini on" : "cafe-chip mini"}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        allergens: on
                          ? draft.allergens.filter((key) => key !== item.key)
                          : [...draft.allergens, item.key],
                      })
                    }
                  >
                    {isAr ? item.ar : item.en}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {activeKeys.size === 0 ? null : null}
      </div>
      <aside className="cafe-preview">
        <div className="cafe-label">{t("cafe.drinks.preview")}</div>
        <label className="cafe-drop">
          {draft.image_url ? (
            <img src={draft.image_url} alt="" />
          ) : (
            <span>{t("cafe.drinks.drop")}</span>
          )}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
        <div style={{ fontWeight: 800, fontSize: 20, marginTop: 12 }}>
          {titleName}
        </div>
        <div className="cafe-muted" dir="ltr">
          {draft.name_en || "Spanish Latte"}
        </div>
      </aside>
    </CafeDialog>
  );
}
