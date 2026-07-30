import type { GroupDraft, DrinkDraft } from "./types";

export const DRINK_IMAGE_BUCKET = "drink-images";

export const ALLERGEN_CARDS = [
  { key: "milk", en: "Milk", ar: "حليب", icon: "🥛" },
  { key: "nuts", en: "Nuts", ar: "مكسرات", icon: "🥜" },
  { key: "soy", en: "Soy", ar: "صويا", icon: "🫘" },
  { key: "gluten", en: "Gluten", ar: "غلوتين", icon: "🌾" },
  { key: "egg", en: "Egg", ar: "بيض", icon: "🥚" },
  { key: "coconut", en: "Coconut", ar: "جوز الهند", icon: "🥥" },
] as const;

export const DRINK_CATEGORIES = [
  { key: "espresso", label: "Espresso" },
  { key: "brewed", label: "Brewed Coffee" },
  { key: "iced", label: "Iced & Cold Brew" },
  { key: "tea", label: "Tea & Infusions" },
  { key: "other", label: "Other" },
] as const;

export function newKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyDraft(): DrinkDraft {
  return {
    id: null,
    name_en: "",
    name_ar: "",
    category: "espresso",
    is_active: true,
    image_url: null,
    image_path: null,
    image_offset: { x: 50, y: 50 },
    image_zoom: 1,
    calories: "",
    serving_size: "medium",
    temperature: "hot",
    caffeine: "medium",
    sugar: "low",
    allergens: [],
    groups: [],
  };
}

type Template = { key: string; label_en: string; label_ar: string; icon: string; build: () => GroupDraft };

function group(
  name_en: string,
  name_ar: string,
  selection_type: GroupDraft["selection_type"],
  is_required: boolean,
  options: Array<[string, string]>,
): GroupDraft {
  return {
    key: newKey(),
    name_en,
    name_ar,
    selection_type,
    is_required,
    is_enabled: true,
    options: options.map(([en, ar], index) => ({
      key: newKey(),
      name_en: en,
      name_ar: ar,
      is_active: true,
      is_default: index === 0 && selection_type === "single",
    })),
  };
}

export const GROUP_TEMPLATES: Template[] = [
  {
    key: "milk",
    label_en: "Milk",
    label_ar: "الحليب",
    icon: "🥛",
    build: () =>
      group("Milk", "الحليب", "single", true, [
        ["Whole milk", "حليب كامل"],
        ["Skim milk", "حليب خالي الدسم"],
        ["Oat milk", "حليب الشوفان"],
        ["Almond milk", "حليب اللوز"],
      ]),
  },
  {
    key: "sugar",
    label_en: "Sugar",
    label_ar: "السكر",
    icon: "🍬",
    build: () =>
      group("Sugar", "السكر", "single", false, [
        ["No sugar", "بدون سكر"],
        ["Light", "خفيف"],
        ["Regular", "عادي"],
        ["Extra", "زيادة"],
      ]),
  },
  {
    key: "extra_shot",
    label_en: "Extra Shot",
    label_ar: "جرعة إضافية",
    icon: "☕",
    build: () =>
      group("Extra Shot", "جرعة إضافية", "multiple", false, [
        ["One shot", "جرعة واحدة"],
        ["Two shots", "جرعتان"],
      ]),
  },
  {
    key: "syrup",
    label_en: "Syrup",
    label_ar: "النكهات",
    icon: "🍯",
    build: () =>
      group("Syrup", "النكهات", "multiple", false, [
        ["Vanilla", "فانيلا"],
        ["Caramel", "كراميل"],
        ["Hazelnut", "بندق"],
      ]),
  },
  {
    key: "temperature",
    label_en: "Temperature",
    label_ar: "درجة الحرارة",
    icon: "🌡️",
    build: () =>
      group("Temperature", "درجة الحرارة", "single", true, [
        ["Hot", "ساخن"],
        ["Iced", "مثلج"],
      ]),
  },
  {
    key: "size",
    label_en: "Size",
    label_ar: "الحجم",
    icon: "📏",
    build: () =>
      group("Size", "الحجم", "single", true, [
        ["Small", "صغير"],
        ["Medium", "وسط"],
        ["Large", "كبير"],
      ]),
  },
  {
    key: "custom",
    label_en: "Custom Group",
    label_ar: "مجموعة مخصصة",
    icon: "✨",
    build: () => group("", "", "single", false, []),
  },
];
