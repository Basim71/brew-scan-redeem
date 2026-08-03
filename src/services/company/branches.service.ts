import { supabase } from "@/integrations/supabase/client";

export type BranchRow = {
  id: string;
  branch_code: string | null;
  name_en: string;
  name_ar: string;
  address_en: string | null;
  address_ar: string | null;
  phone: string | null;
  maps_url: string | null;
  logo_url: string | null;
  qr_token: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
  is_active: boolean;
  created_at: string;
};

const SELECT =
  "id,branch_code,name_en,name_ar,address_en,address_ar,phone,maps_url,logo_url,qr_token,opening_time,closing_time,working_days,is_active,created_at";

export async function listBranches(): Promise<BranchRow[]> {
  const { data, error } = await supabase
    .from("branches")
    .select(SELECT)
    .order("branch_code", { ascending: true })
    .returns<BranchRow[]>();
  if (error) throw error;
  return data ?? [];
}

export type BranchInput = Omit<BranchRow, "id" | "created_at" | "qr_token" | "branch_code"> & {
  branch_code?: string | null;
};

export async function createBranch(input: BranchInput): Promise<void> {
  const { error } = await supabase.from("branches").insert(input as any);
  if (error) throw error;
}

export async function updateBranch(id: string, input: Partial<BranchInput>): Promise<void> {
  const { error } = await supabase.from("branches").update(input as any).eq("id", id);
  if (error) throw error;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw error;
}