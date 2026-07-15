import { useMemo, useState } from "react";
import { AlertTriangle, Coffee, Flame, Loader2, RotateCcw, ShoppingBag } from "lucide-react";
import type { Drink, DrinkOrderCustomization } from "./types";

type Props = {
  drink: Drink;
  language: "ar" | "en";
  position: number;
  active: boolean;
  flipped: boolean;
  orderMode: boolean;
  busy: boolean;
  canOrder: boolean;
  onSelect: () => void;
  onFlip: () => void;
  onOrder: (customization: DrinkOrderCustomization) => void;
};

const ALLERGEN_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  milk: { en: "Milk", ar: "حليب", icon: "🥛" },
  nuts: { en: "Nuts", ar: "مكسرات", icon: "🥜" },
  coconut: { en: "Coconut", ar: "جوز الهند", icon: "🥥" },
  soy: { en: "Soy", ar: "صويا", icon: "🫘" },
  gluten: { en: "Gluten", ar: "غلوتين", icon: "🌾" },
  egg: { en: "Egg", ar: "بيض", icon: "🥚" },
};

export function DrinkCard(props: Props) {
  const { drink, language, position, active, flipped, orderMode, busy, canOrder, onSelect, onFlip, onOrder } = props;
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  const primary = language === "ar" ? drink.name_ar : drink.name_en;
  const secondary = language === "ar" ? drink.name_en : drink.name_ar;
  const selectedIds = useMemo(() => Object.values(selected).flat(), [selected]);

  function choose(groupId: string, optionId: string, multiple: boolean) {
    setValidation(null);
    setSelected((current) => {
      const currentIds = current[groupId] ?? [];
      return {
        ...current,
        [groupId]: multiple
          ? currentIds.includes(optionId)
            ? currentIds.filter((id) => id !== optionId)
            : [...currentIds, optionId]
          : [optionId],
      };
    });
  }

  function submitOrder() {
    const missing = drink.option_groups.find((group) => group.is_required && !(selected[group.id]?.length));
    if (missing) {
      setValidation(language === "ar" ? `اختر ${missing.name_ar}` : `Select ${missing.name_en}`);
      return;
    }
    onOrder({ selectedOptionIds: selectedIds, note: note.trim() });
  }

  function handleFrontClick() {
    if (!active) return onSelect();
    if (orderMode) onFlip();
  }

  return (
    <article
      className={["kob-voyager-card", active && "kob-voyager-card-active", flipped && "kob-voyager-card-flipped"].filter(Boolean).join(" ")}
      style={{ "--card-position": position } as React.CSSProperties}
      aria-hidden={!active}
    >
      <div className="kob-voyager-card-inner">
        <button type="button" className="kob-voyager-card-face kob-voyager-card-front" onClick={handleFrontClick}>
          {drink.image_url ? <img src={drink.image_url} alt={primary} draggable={false} className="kob-voyager-card-image" /> : <div className="kob-voyager-card-placeholder"><Coffee className="h-16 w-16" /></div>}
          <div className="kob-voyager-card-overlay" />
          <div className="kob-drink-badges">
            {drink.calories != null && <span className="kob-drink-badge"><Flame className="h-3.5 w-3.5" />{drink.calories}</span>}
            {drink.allergens.slice(0, 3).map((key) => <span key={key} className="kob-drink-badge kob-allergen-badge" title={ALLERGEN_LABELS[key]?.[language] ?? key}>{ALLERGEN_LABELS[key]?.icon ?? "⚠️"}</span>)}
          </div>
          <div className="kob-voyager-card-copy">
            <span className="kob-voyager-card-name">{primary}</span>
            <span className="kob-voyager-card-secondary-name">{secondary}</span>
            {active && orderMode && <span className="kob-voyager-card-tap-hint">{language === "ar" ? "اضغط للتخصيص" : "Tap to customize"}</span>}
          </div>
        </button>

        <div className="kob-voyager-card-face kob-voyager-card-back kob-customization-back">
          <button type="button" onClick={onFlip} className="kob-voyager-card-back-button"><RotateCcw className="h-4 w-4" /></button>
          <div className="kob-customization-scroll">
            <div className="kob-voyager-back-copy">
              <span className="kob-voyager-back-eyebrow">{language === "ar" ? "تخصيص الطلب" : "Customize order"}</span>
              <h3>{primary}</h3>
              {drink.calories != null && <p>{drink.calories} kcal</p>}
            </div>

            {drink.allergens.length > 0 && (
              <div className="kob-allergen-panel">
                <div className="kob-customization-heading"><AlertTriangle className="h-4 w-4" />{language === "ar" ? "مسببات الحساسية" : "Allergens"}</div>
                <div className="kob-allergen-list">{drink.allergens.map((key) => <span key={key}>{ALLERGEN_LABELS[key]?.icon ?? "⚠️"} {ALLERGEN_LABELS[key]?.[language] ?? key}</span>)}</div>
              </div>
            )}

            {drink.option_groups.map((group) => (
              <fieldset key={group.id} className="kob-option-group">
                <legend>{language === "ar" ? group.name_ar : group.name_en}{group.is_required && <b> *</b>}</legend>
                <div className="kob-option-list">
                  {group.options.filter((o) => o.is_active).map((option) => {
                    const checked = selected[group.id]?.includes(option.id) ?? false;
                    return (
                      <label key={option.id} className={checked ? "kob-option-chip kob-option-chip-active" : "kob-option-chip"}>
                        <input type={group.selection_type === "multiple" ? "checkbox" : "radio"} name={`group-${group.id}`} checked={checked} onChange={() => choose(group.id, option.id, group.selection_type === "multiple")} />
                        <span>{language === "ar" ? option.name_ar : option.name_en}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <label className="kob-order-note-label">
              <span>{language === "ar" ? "تعليق للطلب" : "Order note"}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} maxLength={300} placeholder={language === "ar" ? "مثال: بدون رغوة" : "Example: no foam"} />
              <small>{note.length}/300</small>
            </label>
            {validation && <p className="kob-option-validation">{validation}</p>}
          </div>

          <button type="button" disabled={busy || !canOrder} onClick={(e) => { e.stopPropagation(); submitOrder(); }} className="btn-brass kob-voyager-order-button">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
            <span>{language === "ar" ? "اطلب الآن" : "Order Now"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
