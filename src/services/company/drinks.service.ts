import { supabase } from "@/integrations/supabase/client";

export const DRINK_IMAGE_BUCKET = "drink-images";

export type DrinkOptionRow = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  sort_order: number;
};

export type DrinkOptionGroupRow = {
  id: string;
  name_en: string;
  name_ar: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  sort_order: number;
  drink_options: DrinkOptionRow[];
};

export type DrinkTypeRow = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  image_url: string | null;
  image_path: string | null;
  calories: number | null;
  allergens: string[];
  drink_option_groups: DrinkOptionGroupRow[];
};

const DRINK_SELECT = `
  id,name_en,name_ar,is_active,image_url,image_path,calories,allergens,
  drink_option_groups(
    id,name_en,name_ar,selection_type,is_required,sort_order,
    drink_options(id,name_en,name_ar,is_active,sort_order)
  )
`;

export async function listDrinks(): Promise<DrinkTypeRow[]> {
  const { data, error } = await supabase
    .from("drink_types")
    .select(DRINK_SELECT)
    .order("name_en")
    .returns<DrinkTypeRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function setDrinkActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("drink_types").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteDrink(id: string, imagePath: string | null): Promise<void> {
  const { error } = await supabase.from("drink_types").delete().eq("id", id);
  if (error) throw error;
  if (imagePath) await supabase.storage.from(DRINK_IMAGE_BUCKET).remove([imagePath]);
}

export async function removeDrinkImage(path: string): Promise<void> {
  await supabase.storage.from(DRINK_IMAGE_BUCKET).remove([path]);
}

export async function uploadDrinkImage(path: string, file: File): Promise<string> {
  const upload = await supabase.storage
    .from(DRINK_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (upload.error) throw upload.error;
  return supabase.storage.from(DRINK_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}