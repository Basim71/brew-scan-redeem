import { supabase } from "@/integrations/supabase/client";

export type SubscriptionRow = {
  id: string;
  status: "active" | "expired" | "cancelled";
  start_date: string;
  end_date: string;
  created_at: string;
  customer: { id: string; name: string; phone: string } | null;
  plan: { id: string; name: string; duration_days: number } | null;
  branch: { id: string; name_en: string; name_ar: string } | null;
};

const SELECT = `
  id,status,start_date,end_date,created_at,
  customer:customers(id,name,phone),
  plan:plans(id,name,duration_days),
  branch:branches(id,name_en,name_ar)
`;

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .returns<SubscriptionRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function setSubscriptionStatus(
  id: string,
  status: "active" | "expired" | "cancelled",
): Promise<void> {
  const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
  if (error) throw error;
}