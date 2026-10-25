import { Coffee, Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ALLERGEN_CARDS } from "../constants";
import type { DrinkDraft } from "../types";

export function LivePreview({ draft, compact = false }: { draft: DrinkDraft; compact?: boolean }) {
  const { t, lang } = useI18n();
  const name = lang === "ar" ? draft.name_ar || draft.name_en : draft.name_en || draft.name_ar;
  const altName = lang === "ar" ? draft.name_en : draft.name_ar;
  const groups = draft.groups.filter((group) => group.is_enabled);
  return (
    <div className="ds-preview" data-compact={compact ? "true" : "false"}>
      <div className="ds-preview-card">
        <div className="ds-preview-media">
          {draft.image_url ? (
            <img
              src={draft.image_url}
              alt={name || t("drinks.preview")}
              style={{
                objectPosition: `${draft.image_offset.x}% ${draft.image_offset.y}%`,
                transform: `scale(${draft.image_zoom})`,
              }}
            />
          ) : (
            <div className="ds-preview-placeholder">
              <Coffee className="h-10 w-10" />
            </div>
          )}
          <span className="ds-preview-status" data-active={draft.is_active ? "true" : "false"}>
            {draft.is_active ? t("drinks.active") : t("drinks.inactive")}
          </span>
        </div>
        <div className="ds-preview-body">
          <h4>{name || t("drinks.drinkName")}</h4>
          {altName && <p dir={lang === "ar" ? "ltr" : "rtl"}>{altName}</p>}
          <div className="ds-preview-meta">
            {draft.calories && (
              <span>
                <Flame className="h-3.5 w-3.5" />
                {draft.calories} {t("drinks.kcal")}
              </span>
            )}
            <span>{draft.temperature === "both" ? t("drinks.hotCold") : draft.temperature === "hot" ? t("drinks.hot") : t("drinks.cold")}</span>
            <span>{t("drinks.optionsCount", { n: groups.length })}</span>
          </div>
          {draft.allergens.length > 0 && (
            <div className="ds-preview-allergens">
              {draft.allergens.map((key) => {
                const item = ALLERGEN_CARDS.find((card) => card.key === key);
                return (
                  <span key={key}>
                    {item?.icon ?? "⚠️"} {(lang === "ar" ? item?.ar : item?.en) ?? key}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!compact && groups.length > 0 && (
        <div className="ds-preview-options">
          <span className="ds-preview-options-title">{t("drinks.orderPreview")}</span>
          {groups.map((group) => (
            <div key={group.key} className="ds-preview-group">
              <strong>
                {(lang === "ar" ? group.name_ar || group.name_en : group.name_en || group.name_ar) || t("drinks.untitledGroup")}
                {group.is_required ? " *" : ""}
              </strong>
              <div>
                {group.options
                  .filter((option) => option.is_active)
                  .map((option) => (
                    <span key={option.key} data-default={option.is_default ? "true" : "false"}>
                      {(lang === "ar" ? option.name_ar || option.name_en : option.name_en || option.name_ar) || t("drinks.option")}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
