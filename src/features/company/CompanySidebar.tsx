import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Coffee,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  UserRoundCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import { canAccessCompanyRoute, type CompanyRoute } from "./access";

export type CompanyNavItem = {
  to: CompanyRoute;
  labelKey: { ar: string; en: string };
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV_ITEMS: CompanyNavItem[] = [
  { to: "/admin", labelKey: { ar: "لوحة التحكم", en: "Overview" }, icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", labelKey: { ar: "العملاء", en: "Customers" }, icon: Users },
  { to: "/admin/subscriptions", labelKey: { ar: "الاشتراكات", en: "Subscriptions" }, icon: WalletCards },
  { to: "/admin/orders", labelKey: { ar: "الطلبات", en: "Orders" }, icon: ShoppingBag },
  { to: "/admin/drinks", labelKey: { ar: "المشروبات", en: "Drinks" }, icon: Coffee },
  { to: "/admin/coupons", labelKey: { ar: "الكوبونات", en: "Coupons" }, icon: Ticket },
  { to: "/admin/sell-coupon", labelKey: { ar: "بيع كوبون", en: "Sell Coupon" }, icon: ShoppingCart },
  { to: "/admin/plans", labelKey: { ar: "الخطط", en: "Plans" }, icon: Boxes },
  { to: "/admin/branches", labelKey: { ar: "الفروع", en: "Branches" }, icon: Building2 },
  { to: "/admin/cashiers", labelKey: { ar: "الكاشير", en: "Cashiers" }, icon: UserRoundCog },
  { to: "/admin/reports", labelKey: { ar: "التقارير", en: "Reports" }, icon: BadgeDollarSign },
  { to: "/admin/customer-success", labelKey: { ar: "نجاح العملاء", en: "Customer Success" }, icon: Headphones },
  { to: "/admin/settings", labelKey: { ar: "الإعدادات", en: "Settings" }, icon: Settings },
];

type Props = {
  title: string;
  subtitle: string;
  onSignOut: () => void | Promise<void>;
};

export function CompanySidebar({ title, subtitle, onSignOut }: Props) {
  const { lang } = useI18n();
  const { role } = useOrganization();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRTL = lang === "ar";
  const items = NAV_ITEMS.filter((item) => canAccessCompanyRoute(item.to, role));
  const isActive = (item: CompanyNavItem) =>
    item.exact ? currentPath === item.to : currentPath === item.to || currentPath.startsWith(`${item.to}/`);

  return (
    <>
      <button
        type="button"
        className="company-nav-mobile-toggle"
        aria-label={isRTL ? "القائمة" : "Menu"}
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
      {mobileOpen && <div className="company-nav-scrim" onClick={() => setMobileOpen(false)} aria-hidden />}
      <aside
        className="company-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        data-mobile-open={mobileOpen ? "true" : "false"}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="company-sidebar-header">
          <Link to="/admin" className="company-sidebar-brand" onClick={() => setMobileOpen(false)}>
            <span className="company-sidebar-mark">KOB</span>
            {!collapsed && (
              <div className="company-sidebar-title">
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </div>
            )}
          </Link>
          <button type="button" className="company-sidebar-collapse" onClick={() => setCollapsed((v) => !v)} aria-label={isRTL ? "طي القائمة" : "Collapse"}>
            {isRTL
              ? (collapsed ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />)
              : (collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />)}
          </button>
          <button type="button" className="company-sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label={isRTL ? "إغلاق" : "Close"}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="company-sidebar-nav" aria-label={isRTL ? "التنقل" : "Navigation"}>
          {items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                onClick={() => setMobileOpen(false)}
                className="company-nav-link"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
                title={isRTL ? item.labelKey.ar : item.labelKey.en}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{isRTL ? item.labelKey.ar : item.labelKey.en}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="company-sidebar-footer">
          <button type="button" onClick={() => void onSignOut()} className="company-nav-signout">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>{isRTL ? "تسجيل الخروج" : "Sign out"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}