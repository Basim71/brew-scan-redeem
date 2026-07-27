import type { LoginDestination, Membership } from "../types";

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export function isValidMembership(m: Membership): boolean {
  return (
    m.status === "active" &&
    m.organization.status === "active"
  );
}

export function resolveLoginDestination(m: Membership): LoginDestination {
  if (!isValidMembership(m)) return { kind: "unauthorized" };
  if (m.organization.type === "platform") return { kind: "platform", membership: m };
  if (m.organization.type === "company") {
    if (ADMIN_ROLES.has(m.role)) return { kind: "admin", membership: m };
    if (m.role === "cashier") return { kind: "cashier", membership: m };
  }
  return { kind: "unauthorized" };
}

export function pathForDestination(dest: LoginDestination): string {
  switch (dest.kind) {
    case "platform":
      return "/platform";
    case "admin":
      return "/admin";
    case "cashier":
      return "/cashier";
    default:
      return "/auth";
  }
}