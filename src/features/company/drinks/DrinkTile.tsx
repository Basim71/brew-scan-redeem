import { Coffee, Copy, Eye, Flame, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";

import { Dropdown, DropdownItem, IconButton } from "@/components/kob";
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

function updatedLabel(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}

export function DrinkTile({ drink, view, onPreview, onEdit, onToggle, onDuplicate, onDelete }: Props) {
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
        aria-label={`Edit ${drink.name_en}`}
      >
        {drink.image_url ? (
          <img src={drink.image_url} alt={drink.name_en} loading="lazy" />
        ) : (
          <div className="ds-tile-placeholder">
            <Coffee className="h-9 w-9" />
          </div>
        )}
        <span className="ds-tile-status" data-active={drink.is_active ? "true" : "false"}>
          {drink.is_active ? "Active" : "Inactive"}
        </span>
        <span className="ds-tile-edit-cue" aria-hidden="true">
          <Pencil className="h-4 w-4" />
          Edit
        </span>
        <div className="ds-tile-actions" onClick={(event) => event.stopPropagation()}>
          <IconButton label="Preview" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4" />
          </IconButton>
          <Dropdown
            label="More actions"
            trigger={({ toggle }) => (
              <IconButton label="More" size="sm" aria-haspopup="menu" onClick={toggle}>
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            )}
          >
            <DropdownItem icon={<Power className="h-4 w-4" />} onSelect={onToggle}>
              {drink.is_active ? "Disable" : "Enable"}
            </DropdownItem>
            <DropdownItem icon={<Copy className="h-4 w-4" />} onSelect={onDuplicate}>
              Duplicate
            </DropdownItem>
            <DropdownItem icon={<Trash2 className="h-4 w-4" />} tone="danger" onSelect={onDelete}>
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="ds-tile-body">
        <h3>{drink.name_en}</h3>
        <p dir="rtl">{drink.name_ar}</p>
        <div className="ds-tile-meta">
          <span>
            <Flame className="h-3.5 w-3.5" />
            {drink.calories ?? "—"} kcal
          </span>
          <span>{drink.option_groups.length} option groups</span>
        </div>
        <div className="ds-tile-allergens">
          {drink.allergens.length === 0 ? (
            <span className="ds-tile-allergen">No allergens</span>
          ) : (
            drink.allergens.map((key) => {
              const item = ALLERGEN_CARDS.find((card) => card.key === key);
              return (
                <span key={key} className="ds-tile-allergen">
                  {item?.icon ?? "⚠️"} {item?.en ?? key}
                </span>
              );
            })
          )}
        </div>
        <span className="ds-tile-updated">{updatedLabel(drink.created_at)}</span>
      </div>
    </article>
  );
}
