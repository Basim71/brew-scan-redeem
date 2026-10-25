import { Coffee, Copy, Eye, Flame, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";

import { Dropdown, DropdownItem, IconButton } from "@/components/kob";
import { useI18n } from "@/lib/i18n";
import { ALLERGEN_CARDS } from "./constants";
import type { DrinkRecord, DrinkViewMode } from "./types";

type Props = {
  drink: DrinkRecord;
  view: DrinkViewMode;
  onPreview: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function updatedLabel(iso: string | null, t: (k: string, v?: Record<string, number>) => string): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t("drinks.updatedToday");
  if (days === 1) return t("drinks.updatedYesterday");
  return t("drinks.updatedDays", { n: days });
}

export function DrinkTile({ drink, view, onPreview, onEdit, onToggle, onDuplicate, onDelete }: Props) {
  const { t, lang } = useI18n();
  const name = lang === "ar" ? drink.name_ar || drink.name_en : drink.name_en || drink.name_ar;
  const altName = lang === "ar" ? drink.name_en : drink.name_ar;
  return (
    <article className="ds-tile" data-view={view}>
      <div
        className="ds-tile-media"
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onEdit();
          }
        }}
        aria-label={t("drinks.editName", { name })}
      >
        {drink.image_url ? (
          <img src={drink.image_url} alt={name} loading="lazy" />
        ) : (
          <div className="ds-tile-placeholder">
            <Coffee className="h-9 w-9" />
          </div>
        )}
        <span className="ds-tile-status" data-active={drink.is_active ? "true" : "false"}>
          {drink.is_active ? t("drinks.active") : t("drinks.inactive")}
        </span>
        <span className="ds-tile-edit-cue" aria-hidden="true">
          <Pencil className="h-4 w-4" />
          {t("drinks.edit")}
        </span>
        <div className="ds-tile-actions" onClick={(event) => event.stopPropagation()}>
          <IconButton label={t("drinks.preview")} size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4" />
          </IconButton>
          <Dropdown
            label={t("drinks.moreActions")}
            trigger={({ toggle }) => (
              <IconButton label={t("drinks.more")} size="sm" aria-haspopup="menu" onClick={toggle}>
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            )}
          >
            <DropdownItem icon={<Power className="h-4 w-4" />} onSelect={onToggle}>
              {drink.is_active ? t("drinks.disable") : t("drinks.enable")}
            </DropdownItem>
            <DropdownItem icon={<Copy className="h-4 w-4" />} onSelect={onDuplicate}>
              {t("drinks.duplicate")}
            </DropdownItem>
            <DropdownItem icon={<Trash2 className="h-4 w-4" />} tone="danger" onSelect={onDelete}>
              {t("drinks.delete")}
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="ds-tile-body">
        <h3>{name}</h3>
        <p dir={lang === "ar" ? "ltr" : "rtl"}>{altName}</p>
        <div className="ds-tile-meta">
          <span>
            <Flame className="h-3.5 w-3.5" />
            {drink.calories ?? "—"} {t("drinks.kcal")}
          </span>
          <span>{t("drinks.optionGroups", { n: drink.option_groups.length })}</span>
        </div>
        <div className="ds-tile-allergens">
          {drink.allergens.length === 0 ? (
            <span className="ds-tile-allergen">{t("drinks.noAllergens")}</span>
          ) : (
            drink.allergens.map((key) => {
              const item = ALLERGEN_CARDS.find((card) => card.key === key);
              return (
                <span key={key} className="ds-tile-allergen">
                  {item?.icon ?? "⚠️"} {(lang === "ar" ? item?.ar : item?.en) ?? key}
                </span>
              );
            })
          )}
        </div>
        <span className="ds-tile-updated">{updatedLabel(drink.created_at, t)}</span>
      </div>
    </article>
  );
}
