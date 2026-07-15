import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  BarChart3,
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
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { FullScreenLoader } from "@/lib/ui";
import { useRole } from "@/lib/use-auth";

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
  const { session, role, ready } = useRole();
  const { t, lang } = useI18n();

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      navigate({ to: "/auth" });
      return;
    }

    if (role === "admin") return;

    if (role === "cashier") {
      navigate({ to: "/cashier" });
      return;
    }

    void supabase.auth.signOut().then(() => navigate({ to: "/auth" }));
  }, [navigate, ready, role, session]);

  if (!ready || role !== "admin") return <FullScreenLoader />;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <main className="kob-app-shell kob-topnav-shell">
      <header className="kob-floating-island-wrap">
        <div className="kob-floating-island panel-warm">
          <Link to="/admin" className="kob-island-brand" aria-label="KOB Admin">
            <span className="kob-brand-icon">
              <Coffee className="h-5 w-5" />
            </span>
            <span className="kob-island-brand-copy">
              <strong>KOB</strong>
              <small>{lang === "ar" ? "لوحة الإدارة" : "Admin"}</small>
            </span>
          </Link>

          <nav className="kob-island-navigation" aria-label="Admin navigation">
            <IslandLink to="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label={t("nav_dashboard")} exact />
            <IslandLink to="/admin/plans" icon={<Boxes className="h-4 w-4" />} label={t("nav_plans")} />
            <IslandLink to="/admin/drinks" icon={<CupSoda className="h-4 w-4" />} label={lang === "ar" ? "المشروبات" : "Drinks"} />
            <IslandLink to="/admin/coupons" icon={<Ticket className="h-4 w-4" />} label={t("nav_coupons")} />
            <IslandLink to="/admin/sell-coupon" icon={<ShoppingCart className="h-4 w-4" />} label={t("nav_sell_coupon")} />
            <IslandLink to="/admin/subscriptions" icon={<Users className="h-4 w-4" />} label={t("all_subs")} />
            <IslandLink to="/admin/financial-reports" icon={<BarChart3 className="h-4 w-4" />} label={lang === "ar" ? "التقارير المالية" : "Financial"} />
            <IslandLink to="/admin/branches" icon={<Building2 className="h-4 w-4" />} label={t("tab_branches")} />
            <IslandLink to="/admin/cashiers" icon={<UserRoundCog className="h-4 w-4" />} label={t("tab_staff")} />
          </nav>

          <div className="kob-island-actions">
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
      </header>

      <section className="kob-dashboard-content kob-topnav-content">
        <Outlet />
      </section>
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
  | "/admin/financial-reports"
  | "/admin/branches"
  | "/admin/cashiers";

type IslandLinkProps = {
  to: AdminRoute;
  icon: ReactNode;
  label: string;
  exact?: boolean;
};

function IslandLink({ to, icon, label, exact = false }: IslandLinkProps) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="kob-island-link"
      activeProps={{ className: "kob-island-link kob-island-link-active" }}
      title={label}
    >
      <span className="kob-island-link-icon">{icon}</span>
      <span className="kob-island-link-label">{label}</span>
    </Link>
  );
}
