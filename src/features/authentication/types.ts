import type { Session } from "@supabase/supabase-js";

export type PlatformOrgRole =
  | "platform_owner"
  | "platform_admin"
  | "support_level_1"
  | "support_level_2"
  | "support_level_3";

export type CompanyOrgRole = "owner" | "admin" | "manager" | "cashier";

export type WorkspaceKind = "platform" | "company";

export type Membership = {
  membershipId: string;
  role: string;
  status: string;
  organization: {
    id: string;
    code: string;
    nameAr: string | null;
    nameEn: string | null;
    slug: string | null;
    status: string;
    type: WorkspaceKind;
  };
};

export type LoginDestination =
  | { kind: "platform"; membership: Membership }
  | { kind: "admin"; membership: Membership }
  | { kind: "cashier"; membership: Membership }
  | { kind: "unauthorized" };

export type SignInResult =
  | { status: "single"; destination: LoginDestination; session: Session }
  | { status: "multiple"; memberships: Membership[]; session: Session }
  | { status: "none"; session: Session }
  | { status: "invalid_credentials" }
  | { status: "error"; message: string };