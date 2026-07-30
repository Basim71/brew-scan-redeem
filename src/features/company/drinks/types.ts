export type SelectionType = "single" | "multiple";

export type OptionDraft = {
  key: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  is_default: boolean;
};

export type GroupDraft = {
  key: string;
  name_en: string;
  name_ar: string;
  selection_type: SelectionType;
  is_required: boolean;
  is_enabled: boolean;
  options: OptionDraft[];
};

export type DrinkRecord = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  image_url: string | null;
  image_path: string | null;
  calories: number | null;
  allergens: string[];
  created_at: string | null;
  option_groups: Array<{
    id: string;
    name_en: string;
    name_ar: string;
    selection_type: SelectionType;
    is_required: boolean;
    sort_order: number;
    options: Array<{ id: string; name_en: string; name_ar: string; is_active: boolean; sort_order: number }>;
  }>;
};

export type TemperatureMode = "hot" | "cold" | "both";
export type IntensityLevel = "none" | "low" | "medium" | "high";

/**
 * Wizard draft. Fields marked "presentation only" are not persisted because the
 * drink schema does not store them (schema changes are out of scope).
 */
export type DrinkDraft = {
  id: string | null;
  name_en: string;
  name_ar: string;
  category: string;
  is_active: boolean;
  image_url: string | null;
  image_path: string | null;
  image_offset: { x: number; y: number };
  image_zoom: number;
  calories: string;
  serving_size: string;
  temperature: TemperatureMode;
  caffeine: IntensityLevel;
  sugar: IntensityLevel;
  allergens: string[];
  groups: GroupDraft[];
};

export type DrinkSortKey = "recent" | "name" | "calories";
export type DrinkStatusFilter = "all" | "active" | "inactive";
export type DrinkViewMode = "grid" | "list";
