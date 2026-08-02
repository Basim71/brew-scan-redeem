import { useMemo, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  ClipboardList,
  ShieldCheck,
  Layers3,
  Building2,
  Coffee,
  Headphones,
  LayoutDashboard,
  Settings,
  UserRoundCog,
  Users,
} from "lucide-react";

import { AppWorkspace } from "@/layouts/AppWorkspace";
import type { FloatingIslandItem } from "@/layouts/FloatingIsland";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import { canAccessCompanyRoute, type CompanyRoute } from "./access";

type Props = {
  title: string;
  subtitle: string;
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
};

type PrimaryEntry = {
  to: CompanyRoute;
  labelAr: string;
  labelEn: string;
  icon: FloatingIslandItem extends { icon: infer I } ? I : never;
  exact?: boolean;
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
  { to: "/admin/settings", labelAr: "إعدادات الشركة", labelEn: "Company Settings", icon: Settings },
];

const OPERATIONS: Array<{
  to: CompanyRoute;
  labelAr: string;
  labelEn: string;
  icon: any;
  hash?: string;
}> = [
  { to: "/admin/settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
  { to: "/admin/cashiers", labelAr: "الموظفون", labelEn: "Employees", icon: UserRoundCog },
  { to: "/admin/settings", labelAr: "الأدوار والصلاحيات", labelEn: "Roles & Permissions", icon: ShieldCheck, hash: "employees" },
  { to: "/admin/branches", labelAr: "الفروع", labelEn: "Branches", icon: Building2 },
  { to: "/admin/settings", labelAr: "التنبيهات", labelEn: "Notifications", icon: Bell, hash: "notifications" },
  { to: "/admin/settings", labelAr: "سجل التغييرات", labelEn: "Audit Log", icon: ClipboardList, hash: "audit" },
  { to: "/admin/customer-success", labelAr: "نجاح العملاء", labelEn: "Customer Success", icon: Headphones },
];

export function CompanyLayout({ title, subtitle, onSignOut, children }: Props) {
  const { lang } = useI18n();
  const { role } = useOrganization();
  const isAr = lang === "ar";

  const items = useMemo<FloatingIslandItem[]>(() => {
    const primary: FloatingIslandItem[] = PRIMARY.filter((it) => canAccessCompanyRoute(it.to, role)).map((it) => ({
      kind: "link",
      to: it.to,
      label: isAr ? it.labelAr : it.labelEn,
      icon: it.icon,
      exact: it.exact,
    }));

    const operations = OPERATIONS.filter((it) => canAccessCompanyRoute(it.to, role)).map((it) => ({
      kind: "link" as const,
      to: it.to,
      hash: it.hash,
      label: isAr ? it.labelAr : it.labelEn,
      icon: it.icon,
    }));

    if (operations.length > 0) {
      primary.push({
        kind: "group",
        label: isAr ? "الإدارة" : "Manage",
        icon: Settings,
        children: operations,
      });
    }
    return primary;
  }, [isAr, role]);

  return (
    <AppWorkspace title={title} subtitle={subtitle} homeTo="/admin" items={items} onSignOut={onSignOut}>
      {children}
    </AppWorkspace>
  );
}
