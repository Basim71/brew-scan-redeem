import type { PlatformRole } from "@/providers/PlatformProvider";

export const ALL_PLATFORM_ROLES: PlatformRole[] = [
  "platform_owner",
  "platform_admin",
  "support_level_1",
  "support_level_2",
  "support_level_3",
];

export const ROLE_MATRIX: Record<string, PlatformRole[]> = {
  "/platform": ALL_PLATFORM_ROLES,
  "/platform/companies": ["platform_owner", "platform_admin"],
  "/platform/customer-success": ALL_PLATFORM_ROLES,
  "/platform/training": ["platform_owner", "platform_admin", "support_level_2", "support_level_3"],
  "/platform/users": ["platform_owner", "platform_admin"],
  "/platform/announcements": ALL_PLATFORM_ROLES,
  "/platform/audit": ["platform_owner", "platform_admin"],
  "/platform/settings": ["platform_owner"],
};

export function canAccess(path: string, role: PlatformRole | undefined | null): boolean {
  if (!role) return false;
  const allow = ROLE_MATRIX[path];
  return allow ? allow.includes(role) : false;
}

export function canWriteAnnouncements(role: PlatformRole | undefined | null): boolean {
  return role === "platform_owner" || role === "platform_admin";
}

export function canManageCompanyStatus(role: PlatformRole | undefined | null): boolean {
  return role === "platform_owner" || role === "platform_admin";
}