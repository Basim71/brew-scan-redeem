import { supabase } from "@/integrations/supabase/client";
import type { Membership, SignInResult, WorkspaceKind } from "../types";
import { isValidMembership, resolveLoginDestination } from "../utils/resolveLoginDestination";

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  organization: {
    id: string;
    organization_code: string;
    name_ar: string | null;
    name_en: string | null;
    slug: string | null;
    status: string;
    organization_type: string;
  } | null;
};

function toMembership(row: MembershipRow): Membership | null {
  const org = row.organization;
  if (!org) return null;
  const type = org.organization_type as WorkspaceKind;
  if (type !== "platform" && type !== "company") return null;
  return {
    membershipId: row.id,
    role: row.role,
    status: row.status,
    organization: {
      id: org.id,
      code: org.organization_code,
      nameAr: org.name_ar,
      nameEn: org.name_en,
      slug: org.slug,
      status: org.status,
      type,
    },
  };
}

export async function fetchActiveMemberships(userId: string): Promise<Membership[]> {
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, v: string) => Promise<{ data: MembershipRow[] | null; error: { message: string } | null }>;
      };
    };
  };
  const { data, error } = await db
    .from("organization_members")
    .select(
      "id, role, status, organization:organizations!inner(id, organization_code, name_ar, name_en, slug, status, organization_type)",
    )
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return rows
    .map(toMembership)
    .filter((m): m is Membership => m !== null)
    .filter(isValidMembership);
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.session || !data.user) {
    return { status: "invalid_credentials" };
  }

  try {
    const memberships = await fetchActiveMemberships(data.user.id);

    if (memberships.length === 0) {
      return { status: "none", session: data.session };
    }

    if (memberships.length === 1) {
      const destination = resolveLoginDestination(memberships[0]);
      if (destination.kind === "unauthorized") {
        return { status: "none", session: data.session };
      }
      return { status: "single", destination, session: data.session };
    }

    return { status: "multiple", memberships, session: data.session };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "unknown_error",
    };
  }
}

export async function signOutEverywhere() {
  try {
    window.localStorage.removeItem("kob.activeOrganization");
  } catch {
    // ignore
  }
  await supabase.auth.signOut();
}