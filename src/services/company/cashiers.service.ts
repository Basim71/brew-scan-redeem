import { supabase } from "@/integrations/supabase/client";

export type CashierRow = {
  user_id: string;
  branch_id: string | null;
  profile: { id: string; full_name: string | null; email: string | null } | null;
  branch: { id: string; name_en: string; name_ar: string } | null;
};

const SELECT = `
  user_id,branch_id,
  profile:profiles(id,full_name,email),
  branch:branches(id,name_en,name_ar)
`;

export async function listCashiers(): Promise<CashierRow[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(SELECT)
    .eq("role", "cashier")
    .returns<CashierRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function reassignCashierBranch(userId: string, branchId: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .update({ branch_id: branchId })
    .eq("user_id", userId)
    .eq("role", "cashier");
  if (error) throw error;
}