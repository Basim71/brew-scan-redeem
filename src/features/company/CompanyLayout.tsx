import { useMemo, type ReactNode } from "react";
import {
  BarChart3,
  Layers3,
  Coffee,
  Headphones,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { AppWorkspace } from "@/layouts/AppWorkspace";
import type { FloatingIslandItem, FloatingIslandLink } from "@/layouts/FloatingIsland";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
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
  { to: "/admin", labelAr: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", labelAr: "العملاء", labelEn: "Customers", icon: Users },
  { to: "/admin/drinks", labelAr: "المشروبات", labelEn: "Drinks", icon: Coffee },
  { to: "/admin/plans", labelAr: "الاشتراكات", labelEn: "Subscriptions", icon: Layers3 },
  { to: "/admin/reports", labelAr: "تحليلات الأعمال", labelEn: "Business Analytics", icon: BarChart3 },
];

const ACCOUNT: Array<{
  to: CompanyRoute;
  labelAr: string;
  labelEn: string;
  icon: any;
  hash?: string;
}> = [
  { to: "/admin/support", labelAr: "الدعم الفني", labelEn: "Technical Support", icon: Headphones },
  { to: "/admin/settings", labelAr: "إعدادات الشركة", labelEn: "Company Settings", icon: Settings },
];

export function CompanyLayout({ title, subtitle, onSignOut, children }: Props) {
  const { lang } = useI18n();
  const { role } = useOrganization();
  const isAr = lang === "ar";

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

  return (
    <AppWorkspace
      title={title}
      subtitle={subtitle}
      homeTo="/admin"
      items={items}
      accountLinks={accountLinks}
      onSignOut={onSignOut}
    >
      {children}
    </AppWorkspace>
  );
}
