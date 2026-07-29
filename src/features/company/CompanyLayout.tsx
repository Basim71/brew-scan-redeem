import { useMemo, type ReactNode } from "react";
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  Coffee,
  Headphones,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Ticket,
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
  { to: "/admin/customers", labelAr: "مركز العملاء", labelEn: "Customer Hub", icon: Users },
  { to: "/admin/orders", labelAr: "الاستحقاقات اليومية", labelEn: "Daily Redemptions", icon: ShoppingBag },
  { to: "/admin/drinks", labelAr: "المشروبات", labelEn: "Drinks", icon: Coffee },
  { to: "/admin/plans", labelAr: "الخطط", labelEn: "Plans", icon: Boxes },
  { to: "/admin/coupons", labelAr: "الكوبونات", labelEn: "Coupons", icon: Ticket },
  { to: "/admin/reports", labelAr: "التقارير", labelEn: "Reports", icon: BadgeDollarSign },
];

const MORE: Array<{ to: CompanyRoute; labelAr: string; labelEn: string; icon: any }> = [
  { to: "/admin/branches", labelAr: "الفروع", labelEn: "Branches", icon: Building2 },
  { to: "/admin/cashiers", labelAr: "الموظفون", labelEn: "Employees", icon: UserRoundCog },
  { to: "/admin/customer-success", labelAr: "نجاح العملاء", labelEn: "Customer Success", icon: Headphones },
  { to: "/admin/settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
];

export function CompanyLayout({ title, subtitle, onSignOut, children }: Props) {
  const { lang } = useI18n();
  const { role } = useOrganization();
  const isAr = lang === "ar";

  const items = useMemo<FloatingIslandItem[]>(() => {
    const primary: FloatingIslandItem[] = PRIMARY
      .filter((it) => canAccessCompanyRoute(it.to, role))
      .map((it) => ({
        kind: "link",
        to: it.to,
        label: isAr ? it.labelAr : it.labelEn,
        icon: it.icon,
        exact: it.exact,
      }));

    const more = MORE
      .filter((it) => canAccessCompanyRoute(it.to, role))
      .map((it) => ({
        kind: "link" as const,
        to: it.to,
        label: isAr ? it.labelAr : it.labelEn,
        icon: it.icon,
      }));

    if (more.length > 0) {
      primary.push({
        kind: "group",
        label: isAr ? "المزيد" : "More",
        icon: MoreHorizontal,
        children: more,
      });
    }
    return primary;
  }, [isAr, role]);

  return (
    <AppWorkspace
      title={title}
      subtitle={subtitle}
      homeTo="/admin"
      items={items}
      onSignOut={onSignOut}
    >
      {children}
    </AppWorkspace>
  );
}