import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Building2,
  CupSoda,
  LayoutDashboard,
  ShoppingCart,
  Ticket,
  UserRoundCog,
  Users,
  Headphones,
} from "lucide-react";

import { AppWorkspace } from "@/components/layouts/AppWorkspace";
import { useOrganization } from "@/components/tenant/OrganizationProvider";
import { RoleGate } from "@/components/layouts/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · KOB" },
      { name: "description", content: "KOB admin control panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { organization, clearOrganization } = useOrganization();

  const items = [
    { to: "/admin", label: t("nav_dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/admin/plans", label: t("nav_plans"), icon: Boxes },
    { to: "/admin/drinks", label: lang === "ar" ? "المشروبات" : "Drinks", icon: CupSoda },
    { to: "/admin/coupons", label: t("nav_coupons"), icon: Ticket },
    { to: "/admin/sell-coupon", label: t("nav_sell_coupon"), icon: ShoppingCart },
    { to: "/admin/subscriptions", label: t("all_subs"), icon: Users },
    {
      to: "/admin/financial-reports",
      label: lang === "ar" ? "التقارير المالية" : "Financial",
      icon: BarChart3,
    },
    { to: "/admin/branches", label: t("tab_branches"), icon: Building2 },
    { to: "/admin/cashiers", label: t("tab_staff"), icon: UserRoundCog },
    { to: "/admin/customer-success", label: lang === "ar" ? "نجاح العملاء" : "Customer Success", icon: Headphones },
  ];

  async function handleSignOut() {
    clearOrganization();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <RoleGate allow="admin">
      <AppWorkspace
        title={organization?.nameAr || organization?.nameEn || "KOB"}
        subtitle={lang === "ar" ? "الإدارة" : "Admin"}
        homeTo="/admin"
        items={items}
        onSignOut={handleSignOut}
      >
        <Outlet />
      </AppWorkspace>
    </RoleGate>
  );
}
