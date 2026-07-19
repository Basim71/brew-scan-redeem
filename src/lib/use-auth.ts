import { useOrganization, type OrganizationRole } from "@/components/tenant/OrganizationProvider";

export type AppRole = "admin" | "cashier";

export function mapOrganizationRole(role: OrganizationRole | null): AppRole | null {
  if (role === "cashier") return "cashier";
  if (role === "owner" || role === "admin" || role === "manager") return "admin";
  return null;
}

export function useSession() {
  const { session, ready } = useOrganization();
  return { session, loading: !ready };
}

export function useRole() {
  const {
    session,
    role: organizationRole,
    branchId,
    ready,
    error,
  } = useOrganization();

  return {
    session,
    role: mapOrganizationRole(organizationRole),
    organizationRole,
    branchId,
    ready,
    error,
  };
}
