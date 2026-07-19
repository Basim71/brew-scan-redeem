import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { FullScreenLoader } from "@/lib/ui";
import { useRole } from "@/lib/use-auth";

type StaffRole = "admin" | "cashier";

type RoleGateProps = {
  allow: StaffRole;
  children: ReactNode;
};

export function RoleGate({ allow, children }: RoleGateProps) {
  const navigate = useNavigate();
  const { session, role, ready } = useRole();

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    if (role === allow) return;

    if (role === "admin") {
      navigate({ to: "/admin", replace: true });
      return;
    }

    if (role === "cashier") {
      navigate({ to: "/cashier", replace: true });
      return;
    }

    void supabase.auth.signOut().finally(() => {
      navigate({ to: "/auth", replace: true });
    });
  }, [allow, navigate, ready, role, session]);

  if (!ready || !session || role !== allow) {
    return <FullScreenLoader />;
  }

  return children;
}
