import { supabase } from "@/integrations/supabase/client";

export type Plan = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type PlanInput = {
  name: string;
  duration_days: number;
  price: number;
  is_active: boolean;
};

const SELECT = "id,name,duration_days,price,is_active,created_at";

export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .returns<Plan[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createPlan(payload: PlanInput): Promise<void> {
  const { error } = await supabase.from("plans").insert(payload);
  if (error) throw error;
}

export async function updatePlan(id: string, payload: PlanInput): Promise<void> {
  const { error } = await supabase.from("plans").update(payload).eq("id", id);
  if (error) throw error;
}

export async function setPlanActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("plans").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}