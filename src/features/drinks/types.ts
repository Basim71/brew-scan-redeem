export type DrinkOption = {
  id: string;
  group_id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  sort_order: number;
};

export type DrinkOptionGroup = {
  id: string;
  drink_type_id: string;
  name_en: string;
  name_ar: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  sort_order: number;
  options: DrinkOption[];
};

export type Drink = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  image_url: string | null;
  calories: number | null;
  allergens: string[];
  option_groups: DrinkOptionGroup[];
};

export type DrinkOrderCustomization = {
  selectedOptionIds: string[];
  note: string;
};
