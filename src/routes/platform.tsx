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
import type { FloatingIslandItem, FloatingIslandLink } from "@/layouts/FloatingIsland";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { usePlatform } from "@/providers/PlatformProvider";
import { supabase } from "@/integrations/supabase/client";
import { canAccess } from "@/features/platform/access";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/platform")({ component: PlatformLayout });

const PRIMARY = [
  { to: "/platform", label: "nav.home", icon: LayoutDashboard, exact: true },
  { to: "/platform/companies", label: "nav.companies", icon: Building2 },
  { to: "/platform/support", label: "nav.support", icon: Headphones },
  { to: "/platform/users", label: "nav.team", icon: UsersRound },
] as const;

const MORE = [
  { to: "/platform/training", label: "nav.training", icon: GraduationCap },
  { to: "/platform/announcements", label: "nav.announcements", icon: Bell },
  { to: "/platform/audit", label: "nav.audit", icon: ScrollText },
] as const;

const ACCOUNT = [{ to: "/platform/settings", label: "nav.settings", icon: Settings }] as const;

function PlatformLayout() {
  const navigate = useNavigate();
  const { profile } = usePlatform();
  const role = profile?.role;
  const { t } = useI18n();
  const tr = (k: string) => t(`platform.${k}` as never);

  const items = useMemo<FloatingIslandItem[]>(() => {
    const primary: FloatingIslandItem[] = PRIMARY.filter((i) => canAccess(i.to, role)).map((i) => ({
      kind: "link",
      ...i,
      label: tr(i.label),
    }));
    for (const i of MORE) if (canAccess(i.to, role)) primary.push({ kind: "link", ...i, label: tr(i.label) });
    return primary;
  }, [role, t]);

  const accountLinks = useMemo<FloatingIslandLink[]>(
    () => ACCOUNT.filter((i) => canAccess(i.to, role)).map((i) => ({ kind: "link" as const, ...i, label: tr(i.label) })),
    [role, t],
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const subtitle = profile ? tr(`nav.role_${profile.role}`) : tr("nav.central");

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
