import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { useOrganization } from "@/components/tenant/OrganizationProvider";
import { supabase } from "@/integrations/supabase/client";
import { FullScreenLoader } from "@/lib/ui";
import { mapOrganizationRole } from "@/lib/use-auth";

type StaffRole = "admin" | "cashier";

type RoleGateProps = {
  allow: StaffRole;
  children: ReactNode;
};

export function RoleGate({ allow, children }: RoleGateProps) {
  const navigate = useNavigate();
  const { session, organization, role: organizationRole, ready, clearOrganization } = useOrganization();
  const role = mapOrganizationRole(organizationRole);

  useEffect(() => {
    if (!ready) return;

    if (!session || !organization) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    if (role === allow) return;
    if (role === "admin") navigate({ to: "/admin", replace: true });
    else if (role === "cashier") navigate({ to: "/cashier", replace: true });
    else {
      clearOrganization();
      void supabase.auth.signOut().finally(() => navigate({ to: "/auth", replace: true }));
    }
  }, [allow, clearOrganization, navigate, organization, ready, role, session]);

  if (!ready || !session || !organization || role !== allow) return <FullScreenLoader />;
  return children;
}
