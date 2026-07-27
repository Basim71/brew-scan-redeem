import { supabase } from "@/integrations/supabase/client";

export type PlatformStaffRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

export async function listPlatformStaff(): Promise<PlatformStaffRow[]> {
  const { data, error } = await (supabase as any)
    .from("platform_staff")
    .select("id,full_name,email,role,status,last_login_at,created_at")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as PlatformStaffRow[];
}