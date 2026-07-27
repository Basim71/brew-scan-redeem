import { supabase } from "@/integrations/supabase/client";

export type BranchRow = {
  id: string;
  name_en: string;
  name_ar: string;
  address_en: string | null;
  address_ar: string | null;
  is_active: boolean;
  created_at: string;
};

const SELECT = "id,name_en,name_ar,address_en,address_ar,is_active,created_at";

export async function listBranches(): Promise<BranchRow[]> {
  const { data, error } = await supabase
    .from("branches")
    .select(SELECT)
    .order("name_en")
    .returns<BranchRow[]>();
  if (error) throw error;
  return data ?? [];
}

export type BranchInput = Omit<BranchRow, "id" | "created_at">;

export async function createBranch(input: BranchInput): Promise<void> {
  const { error } = await supabase.from("branches").insert(input);
  if (error) throw error;
}

export async function updateBranch(id: string, input: Partial<BranchInput>): Promise<void> {
  const { error } = await supabase.from("branches").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw error;
}