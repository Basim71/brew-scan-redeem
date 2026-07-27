import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  ScrollText,
  Settings,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";

import { AppWorkspace } from "@/layouts/AppWorkspace";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { usePlatform } from "@/providers/PlatformProvider";
import { supabase } from "@/integrations/supabase/client";
import { canAccess } from "@/features/platform/access";

export const Route = createFileRoute("/platform")({ component: PlatformLayout });

const ALL_ITEMS = [
  { to: "/platform", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/platform/companies", label: "الشركات", icon: Building2 },
  { to: "/platform/customer-success", label: "نجاح العملاء", icon: Headphones },
  { to: "/platform/training", label: "التدريب", icon: GraduationCap },
  { to: "/platform/users", label: "فريق المنصة", icon: UsersRound },
  { to: "/platform/announcements", label: "الإعلانات", icon: Bell },
  { to: "/platform/audit", label: "سجل التدقيق", icon: ScrollText },
  { to: "/platform/settings", label: "الإعدادات", icon: Settings },
] as const;

function PlatformLayout() {
  const navigate = useNavigate();
  const { profile } = usePlatform();

  const items = useMemo(
    () => ALL_ITEMS.filter((item) => canAccess(item.to, profile?.role)),
    [profile?.role],
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
          items={items as any}
          onSignOut={handleSignOut}
        >
          <Outlet />
        </AppWorkspace>
      </div>
    </PlatformGate>
  );
}
