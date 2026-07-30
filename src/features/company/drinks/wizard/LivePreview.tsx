import { Coffee, Flame } from "lucide-react";
import { ALLERGEN_CARDS } from "../constants";
import type { DrinkDraft } from "../types";

export function LivePreview({ draft, compact = false }: { draft: DrinkDraft; compact?: boolean }) {
  const groups = draft.groups.filter((group) => group.is_enabled);
  return (
    <div className="ds-preview" data-compact={compact ? "true" : "false"}>
      <div className="ds-preview-card">
        <div className="ds-preview-media">
          {draft.image_url ? (
            <img
              src={draft.image_url}
              alt={draft.name_en || "Drink preview"}
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
            {draft.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="ds-preview-body">
          <h4>{draft.name_en || "Drink name"}</h4>
          <p dir="rtl">{draft.name_ar || "اسم المشروب"}</p>
          <div className="ds-preview-meta">
            {draft.calories && (
              <span>
                <Flame className="h-3.5 w-3.5" />
                {draft.calories} kcal
              </span>
            )}
            <span>{draft.temperature === "both" ? "Hot / Cold" : draft.temperature === "hot" ? "Hot" : "Cold"}</span>
            <span>{groups.length} options</span>
          </div>
          {draft.allergens.length > 0 && (
            <div className="ds-preview-allergens">
              {draft.allergens.map((key) => {
                const item = ALLERGEN_CARDS.find((card) => card.key === key);
                return (
                  <span key={key}>
                    {item?.icon ?? "⚠️"} {item?.en ?? key}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!compact && groups.length > 0 && (
        <div className="ds-preview-options">
          <span className="ds-preview-options-title">Order preview</span>
          {groups.map((group) => (
            <div key={group.key} className="ds-preview-group">
              <strong>
                {group.name_en || "Untitled group"}
                {group.is_required ? " *" : ""}
              </strong>
              <div>
                {group.options
                  .filter((option) => option.is_active)
                  .map((option) => (
                    <span key={option.key} data-default={option.is_default ? "true" : "false"}>
                      {option.name_en || "Option"}
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
