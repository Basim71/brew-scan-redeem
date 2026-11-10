import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Layers3,
  Megaphone,
  Coffee,
  Headphones,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { AppWorkspace } from "@/layouts/AppWorkspace";
import type {
  FloatingIslandItem,
  FloatingIslandLink,
} from "@/layouts/FloatingIsland";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import { getOrganizationProfile } from "@/services/company/company-settings.service";
import { canAccessCompanyRoute, type CompanyRoute } from "./access";

type Props = {
  title: string;
  subtitle: string;
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
};

const PRIMARY: Array<{
  to: CompanyRoute;
  labelAr: string;
  labelEn: string;
  icon: any;
  exact?: boolean;
}> = [
  {
    to: "/admin",
    labelAr: "الرئيسية",
    labelEn: "Home",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/admin/customers",
    labelAr: "المشتركين",
    labelEn: "Subscribers",
    icon: Users,
  },
  {
    to: "/admin/drinks",
    labelAr: "المشروبات",
    labelEn: "Drinks",
    icon: Coffee,
  },
  { to: "/admin/plans", labelAr: "الباقات", labelEn: "Plans", icon: Layers3 },
  {
    to: "/admin/promotions",
    labelAr: "العروض",
    labelEn: "Promotions",
    icon: Megaphone,
  },
  {
    to: "/admin/reports",
    labelAr: "التقارير",
    labelEn: "Reports",
    icon: BarChart3,
  },
];

const ACCOUNT: Array<{
  to: CompanyRoute;
  labelAr: string;
  labelEn: string;
  icon: any;
  hash?: string;
}> = [
  {
    to: "/admin/settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    icon: Settings,
  },
  {
    to: "/admin/support",
    labelAr: "الدعم",
    labelEn: "Support",
    icon: Headphones,
  },
];

export function CompanyLayout({ title, onSignOut, children }: Props) {
  const { lang } = useI18n();
  const { role, organization, session } = useOrganization();
  const isAr = lang === "ar";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const orgId = organization?.id;
    if (!orgId) {
      setLogoUrl(null);
      return;
    }
    void getOrganizationProfile(orgId)
      .then((profile) => {
        if (!cancelled) setLogoUrl(profile?.logo_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setLogoUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const items = useMemo<FloatingIslandItem[]>(
    () =>
      PRIMARY.filter((it) => canAccessCompanyRoute(it.to, role)).map((it) => ({
        kind: "link",
        to: it.to,
        label: isAr ? it.labelAr : it.labelEn,
        icon: it.icon,
        exact: it.exact,
      })),
    [isAr, role],
  );

  const accountLinks = useMemo<FloatingIslandLink[]>(
    () =>
      ACCOUNT.filter((it) => canAccessCompanyRoute(it.to, role)).map((it) => ({
        kind: "link" as const,
        to: it.to,
        hash: it.hash,
        label: isAr ? it.labelAr : it.labelEn,
        icon: it.icon,
      })),
    [isAr, role],
  );

  const who =
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    session?.user?.email ||
    title;
  const avatarLabel = who.trim().slice(0, 1) || "K";

  return (
    <AppWorkspace
      title={title}
      subtitle=""
      homeTo="/admin"
      logoUrl={logoUrl}
      items={items}
      accountLinks={accountLinks}
      onSignOut={onSignOut}
      shell="cafe"
      avatarLabel={avatarLabel}
      bellTo="/admin/settings"
    >
      {children}
    </AppWorkspace>
  );
}
