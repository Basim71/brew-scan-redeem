import { supabase } from "@/integrations/supabase/client";

export type PlatformMetrics = {
  companies: number;
  activeCompanies: number;
  customers: number;
  pendingCases: number;
  activeCases: number;
  activeStaff: number;
};

export const EMPTY_PLATFORM_METRICS: PlatformMetrics = {
  companies: 0,
  activeCompanies: 0,
  customers: 0,
  pendingCases: 0,
  activeCases: 0,
  activeStaff: 0,
};

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

function getFirstError(results: CountResult[]): string | null {
  return results.find((result) => result.error)?.error?.message ?? null;
}

export async function fetchPlatformMetrics(): Promise<{
  metrics: PlatformMetrics;
  error: string | null;
}> {
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string, options: { count: "exact"; head: true }) => any;
    };
  };

  const [companies, activeCompanies, customers, pendingCases, activeCases, activeStaff] =
    (await Promise.all([
      client
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("organization_type", "company"),
      client
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("organization_type", "company")
        .eq("status", "active"),
      client.from("customers").select("id", { count: "exact", head: true }),
      client
        .from("customer_success_cases")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "triaged", "assigned", "waiting_platform"]),
      client
        .from("customer_success_cases")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      client
        .from("platform_staff")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ])) as CountResult[];

  return {
    metrics: {
      companies: companies.count ?? 0,
      activeCompanies: activeCompanies.count ?? 0,
      customers: customers.count ?? 0,
      pendingCases: pendingCases.count ?? 0,
      activeCases: activeCases.count ?? 0,
      activeStaff: activeStaff.count ?? 0,
    },
    error: getFirstError([
      companies,
      activeCompanies,
      customers,
      pendingCases,
      activeCases,
      activeStaff,
    ]),
  };
}
