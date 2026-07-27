import { supabase } from "@/integrations/supabase/client";

export type AuditRow = {
  id: string | number;
  session_id: string;
  actor_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
};

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const { data, error } = await (supabase as any)
    .from("support_activity_log")
    .select("id,session_id,actor_user_id,action,target_type,target_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}