import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  MoreHorizontal,
  ScrollText,
  Settings,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";

import { AppWorkspace } from "@/layouts/AppWorkspace";
import type { FloatingIslandItem, FloatingIslandLink } from "@/layouts/FloatingIsland";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { usePlatform } from "@/providers/PlatformProvider";
import { supabase } from "@/integrations/supabase/client";
import { canAccess } from "@/features/platform/access";

export const Route = createFileRoute("/platform")({ component: PlatformLayout });

const PRIMARY = [
  { to: "/platform", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/platform/companies", label: "الشركات", icon: Building2 },
  { to: "/platform/support", label: "الدعم الفني", icon: Headphones },
  { to: "/platform/users", label: "فريق المنصة", icon: UsersRound },
] as const;

const MORE = [
  { to: "/platform/training", label: "التدريب", icon: GraduationCap },
  { to: "/platform/announcements", label: "الإعلانات", icon: Bell },
  { to: "/platform/audit", label: "سجل التدقيق", icon: ScrollText },
] as const;

const ACCOUNT = [{ to: "/platform/settings", label: "إعدادات المنصة", icon: Settings }] as const;

const ROLE_LABELS: Record<string, string> = {
  platform_owner: "مالك المنصة",
  platform_admin: "مدير المنصة",
  platform_support: "الدعم الفني",
  platform_trainer: "التدريب",
};

function PlatformLayout() {
  const navigate = useNavigate();
  const { profile } = usePlatform();
  const role = profile?.role;

  const items = useMemo<FloatingIslandItem[]>(() => {
    const primary: FloatingIslandItem[] = PRIMARY.filter((i) => canAccess(i.to, role)).map((i) => ({
      kind: "link",
      ...i,
    }));
    const more = MORE.filter((i) => canAccess(i.to, role)).map((i) => ({ kind: "link" as const, ...i }));
    if (more.length) primary.push({ kind: "group", label: "المزيد", icon: MoreHorizontal, children: more });
    return primary;
  }, [role]);

  const accountLinks = useMemo<FloatingIslandLink[]>(
    () => ACCOUNT.filter((i) => canAccess(i.to, role)).map((i) => ({ kind: "link" as const, ...i })),
    [role],
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const subtitle = profile ? ROLE_LABELS[profile.role] ?? "الإدارة المركزية" : "الإدارة المركزية";

  return (
    <PlatformGate>
      <div className="platform-shell">
        <AppWorkspace
          title="KOB Platform"
          subtitle={subtitle}
          homeTo="/platform"
          items={items}
          accountLinks={accountLinks}
          onSignOut={handleSignOut}
        >
          <Outlet />
        </AppWorkspace>
      </div>
    </PlatformGate>
  );
}
