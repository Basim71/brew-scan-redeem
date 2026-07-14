import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Boxes,
  Building2,
  Coffee,
  CupSoda,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  Ticket,
  UserRoundCog,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  LanguageSwitcher,
  useI18n,
} from "@/lib/i18n";
import { FullScreenLoader } from "@/lib/ui";
import { useRole } from "@/lib/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      {
        title: "Admin · KOB",
      },
      {
        name: "description",
        content: "KOB admin control panel.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),

  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { session, role, ready } = useRole();
  const { t } = useI18n();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session) {
      navigate({
        to: "/auth",
      });

      return;
    }

    if (role === "admin") {
      return;
    }

    if (role === "cashier") {
      navigate({
        to: "/cashier",
      });

      return;
    }

    void supabase.auth.signOut().then(() => {
      navigate({
        to: "/auth",
      });
    });
  }, [
    navigate,
    ready,
    role,
    session,
  ]);

  if (!ready || role !== "admin") {
    return <FullScreenLoader />;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();

    navigate({
      to: "/auth",
    });
  }

  return (
    <main className="kob-app-shell">
      <div className="kob-dashboard-layout">
        <aside className="kob-sidebar panel-warm">
          <div className="kob-sidebar-header">
            <Link
              to="/admin"
              className="kob-sidebar-brand"
            >
              <div className="kob-brand-icon">
                <Coffee className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="kob-brand-title">
                  {t("admin_title")}
                </div>

                <div className="kob-brand-subtitle">
                  {t("admin_sub")}
                </div>
              </div>
            </Link>

            <div className="kob-mobile-actions">
              <LanguageSwitcher />

              <button
                type="button"
                onClick={handleSignOut}
                className="btn-ghost-brass kob-icon-button"
                aria-label={t("signOut")}
                title={t("signOut")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="hairline-divider kob-sidebar-divider" />

          <nav className="kob-sidebar-navigation">
            <SidebarLink
              to="/admin"
              icon={
                <LayoutDashboard className="h-4 w-4" />
              }
              label={t("nav_dashboard")}
              exact
            />

            <SidebarLink
              to="/admin/plans"
              icon={
                <Boxes className="h-4 w-4" />
              }
              label={t("nav_plans")}
            />

            <SidebarLink
              to="/admin/drinks"
              icon={
                <CupSoda className="h-4 w-4" />
              }
              label="Drinks"
            />

            <SidebarLink
              to="/admin/coupons"
              icon={
                <Ticket className="h-4 w-4" />
              }
              label={t("nav_coupons")}
            />

            <SidebarLink
              to="/admin/sell-coupon"
              icon={
                <ShoppingCart className="h-4 w-4" />
              }
              label={t("nav_sell_coupon")}
            />

            <SidebarLink
              to="/admin/subscriptions"
              icon={
                <Users className="h-4 w-4" />
              }
              label={t("all_subs")}
            />

            <SidebarLink
              to="/admin/branches"
              icon={
                <Building2 className="h-4 w-4" />
              }
              label={t("tab_branches")}
            />

            <SidebarLink
              to="/admin/cashiers"
              icon={
                <UserRoundCog className="h-4 w-4" />
              }
              label={t("tab_staff")}
            />
          </nav>

          <div className="kob-sidebar-footer">
            <div className="hairline-divider mb-4" />

            <div className="flex items-center gap-2">
              <LanguageSwitcher />

              <button
                type="button"
                onClick={handleSignOut}
                className="btn-ghost-brass flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-2.5"
              >
                <LogOut className="h-4 w-4 shrink-0" />

                <span className="truncate text-sm">
                  {t("signOut")}
                </span>
              </button>
            </div>
          </div>
        </aside>

        <section className="kob-dashboard-content">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

type AdminRoute =
  | "/admin"
  | "/admin/plans"
  | "/admin/drinks"
  | "/admin/coupons"
  | "/admin/sell-coupon"
  | "/admin/subscriptions"
  | "/admin/branches"
  | "/admin/cashiers";

type SidebarLinkProps = {
  to: AdminRoute;
  icon: ReactNode;
  label: string;
  exact?: boolean;
};

function SidebarLink({
  to,
  icon,
  label,
  exact = false,
}: SidebarLinkProps) {
  return (
    <Link
      to={to}
      activeOptions={{
        exact,
      }}
      className="kob-sidebar-link"
      activeProps={{
        className:
          "kob-sidebar-link kob-sidebar-link-active",
      }}
    >
      <span className="shrink-0">
        {icon}
      </span>

      <span className="truncate">
        {label}
      </span>
    </Link>
  );
}
