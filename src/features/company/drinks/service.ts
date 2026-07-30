import { supabase } from "@/integrations/supabase/client";
import { DRINK_IMAGE_BUCKET, newKey } from "./constants";
import type { DrinkDraft, DrinkRecord } from "./types";

const DRINK_SELECT = `
  id,name_en,name_ar,is_active,image_url,image_path,calories,allergens,created_at,
  option_groups:drink_option_groups(
    id,name_en,name_ar,selection_type,is_required,sort_order,
    options:drink_options(id,name_en,name_ar,is_active,sort_order)
  )
`;

export async function listStudioDrinks(): Promise<DrinkRecord[]> {
  const { data, error } = await supabase
    .from("drink_types")
    .select(DRINK_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DrinkRecord[];
}

export async function setDrinkActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("drink_types").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteDrink(drink: DrinkRecord): Promise<void> {
  const { error } = await supabase.from("drink_types").delete().eq("id", drink.id);
  if (error) throw error;
  if (drink.image_path) await supabase.storage.from(DRINK_IMAGE_BUCKET).remove([drink.image_path]);
}

export async function uploadDrinkImage(file: File): Promise<{ path: string; url: string }> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `drinks/${crypto.randomUUID()}.${ext}`;
  const uploaded = await supabase.storage.from(DRINK_IMAGE_BUCKET).upload(path, file, { contentType: file.type });
  if (uploaded.error) throw uploaded.error;
  return { path, url: supabase.storage.from(DRINK_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}

export function draftFromRecord(record: DrinkRecord): DrinkDraft {
  return {
    id: record.id,
    name_en: record.name_en,
    name_ar: record.name_ar,
    category: "espresso",
    is_active: record.is_active,
    image_url: record.image_url,
    image_path: record.image_path,
    image_offset: { x: 50, y: 50 },
    image_zoom: 1,
    calories: record.calories?.toString() ?? "",
    serving_size: "medium",
    temperature: "hot",
    caffeine: "medium",
    sugar: "low",
    allergens: record.allergens ?? [],
    groups: [...(record.option_groups ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((group) => ({
        key: group.id,
        name_en: group.name_en,
        name_ar: group.name_ar,
        selection_type: group.selection_type,
        is_required: group.is_required,
        is_enabled: true,
        options: [...(group.options ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((option, index) => ({
            key: option.id,
            name_en: option.name_en,
            name_ar: option.name_ar,
            is_active: option.is_active,
            is_default: index === 0 && group.selection_type === "single",
          })),
      })),
  };
}

/** Persists the wizard draft. Returns the saved drink id. */
export async function saveDrinkDraft(draft: DrinkDraft, publish: boolean): Promise<string> {
  const payload = {
    name_en: draft.name_en.trim(),
    name_ar: draft.name_ar.trim(),
    calories: draft.calories ? Number(draft.calories) : null,
    allergens: draft.allergens,
    is_active: publish ? draft.is_active : false,
    image_url: draft.image_url,
    image_path: draft.image_path,
  };

  const result = draft.id
    ? await supabase.from("drink_types").update(payload).eq("id", draft.id).select("id").single()
    : await supabase.from("drink_types").insert(payload).select("id").single();
  if (result.error || !result.data) throw result.error ?? new Error("Unable to save drink.");
  const drinkId = result.data.id;

  await supabase.from("drink_option_groups").delete().eq("drink_type_id", drinkId);

  const enabledGroups = draft.groups.filter((group) => group.is_enabled && group.name_en.trim());
  for (let index = 0; index < enabledGroups.length; index += 1) {
    const group = enabledGroups[index];
    const inserted = await supabase
      .from("drink_option_groups")
      .insert({
        drink_type_id: drinkId,
        name_en: group.name_en.trim(),
        name_ar: group.name_ar.trim() || group.name_en.trim(),
        selection_type: group.selection_type,
        is_required: group.is_required,
        sort_order: index,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) throw inserted.error ?? new Error("Unable to save option group.");
    const options = group.options.filter((option) => option.name_en.trim());
    if (options.length > 0) {
      const { error } = await supabase.from("drink_options").insert(
        options.map((option, optionIndex) => ({
          group_id: inserted.data.id,
          name_en: option.name_en.trim(),
          name_ar: option.name_ar.trim() || option.name_en.trim(),
          is_active: option.is_active,
          sort_order: optionIndex,
        })),
      );
      if (error) throw error;
    }
  }
  return drinkId;
}

export async function duplicateDrink(record: DrinkRecord): Promise<void> {
  const source = draftFromRecord(record);
  await saveDrinkDraft(
    {
      ...source,
      id: null,
      name_en: `${source.name_en} (Copy)`,
      name_ar: `${source.name_ar} (نسخة)`,
      is_active: false,
      groups: source.groups.map((group) => ({
        ...group,
        key: newKey(),
        options: group.options.map((option) => ({ ...option, key: newKey() })),
      })),
    },
    true,
  );
}
