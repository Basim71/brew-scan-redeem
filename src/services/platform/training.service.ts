import { supabase } from "@/integrations/supabase/client";

export type TrainingRow = {
  id: string;
  organization_id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_at: string | null;
  requested_start_at: string | null;
  duration_minutes: number;
  created_at: string;
  organization?: { name_ar: string | null; name_en: string | null } | null;
};

export async function listTraining(scope: "upcoming" | "past" | "all" = "upcoming"): Promise<TrainingRow[]> {
  let q = (supabase as any)
    .from("support_requests")
    .select("id,organization_id,subject,description,status,priority,scheduled_at,requested_start_at,duration_minutes,created_at, organization:organizations(name_ar,name_en)")
    .eq("type", "training");
  const now = new Date().toISOString();
  if (scope === "upcoming") q = q.gte("scheduled_at", now).order("scheduled_at", { ascending: true });
  else if (scope === "past") q = q.lt("scheduled_at", now).order("scheduled_at", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TrainingRow[];
}