import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Headphones,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";

import { AppWorkspace } from "@/components/layouts/AppWorkspace";
import { PlatformGate } from "@/components/platform/PlatformGate";
import { usePlatform } from "@/components/platform/PlatformProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform")({ component: PlatformLayout });

function PlatformLayout() {
  const navigate = useNavigate();
  const { profile } = usePlatform();

  const items = useMemo(
    () => [
      { to: "/platform", label: "الرئيسية", icon: LayoutDashboard, exact: true },
      { to: "/platform/companies", label: "الشركات", icon: Building2 },
      { to: "/platform/support", label: "نجاح العملاء", icon: Headphones },
      { to: "/platform/users", label: "فريق المنصة", icon: UsersRound },
      { to: "/platform/settings", label: "الإعدادات", icon: Settings },
    ],
    [],
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/platform-auth", replace: true });
  }

  const subtitle = profile
    ? `${profile.fullName || profile.email} · ${profile.role}`
    : "الإدارة المركزية";

  return (
    <PlatformGate>
      <div className="platform-shell">
        <AppWorkspace
          title="KOB Platform"
          subtitle={subtitle}
          homeTo="/platform"
          items={items}
          onSignOut={handleSignOut}
        >
          <Outlet />
        </AppWorkspace>
      </div>
    </PlatformGate>
  );
}
