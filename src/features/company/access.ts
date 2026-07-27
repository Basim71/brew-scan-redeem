import type { OrganizationRole } from "@/providers/OrganizationProvider";

export type CompanyRoute =
  | "/admin"
  | "/admin/customers"
  | "/admin/subscriptions"
  | "/admin/orders"
  | "/admin/drinks"
  | "/admin/coupons"
  | "/admin/sell-coupon"
  | "/admin/branches"
  | "/admin/cashiers"
  | "/admin/reports"
  | "/admin/customer-success"
  | "/admin/settings"
  | "/admin/plans";

/**
 * Company portal route visibility per organization role.
 * Cashiers never reach the company portal (blocked by RoleGate).
 * Managers can operate day-to-day but cannot manage branches/staff/settings.
 */
export const COMPANY_ROLE_MATRIX: Record<CompanyRoute, OrganizationRole[]> = {
  "/admin": ["owner", "admin", "manager"],
  "/admin/customers": ["owner", "admin", "manager"],
  "/admin/subscriptions": ["owner", "admin", "manager"],
  "/admin/orders": ["owner", "admin", "manager"],
  "/admin/drinks": ["owner", "admin", "manager"],
  "/admin/coupons": ["owner", "admin", "manager"],
  "/admin/sell-coupon": ["owner", "admin", "manager"],
  "/admin/plans": ["owner", "admin"],
  "/admin/branches": ["owner", "admin"],
  "/admin/cashiers": ["owner", "admin"],
  "/admin/reports": ["owner", "admin", "manager"],
  "/admin/customer-success": ["owner", "admin", "manager"],
  "/admin/settings": ["owner", "admin"],
};

export function canAccessCompanyRoute(
  route: CompanyRoute,
  role: OrganizationRole | null | undefined,
): boolean {
  if (!role) return false;
  return COMPANY_ROLE_MATRIX[route].includes(role);
}