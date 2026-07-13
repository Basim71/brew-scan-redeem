import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Coffee,
  Inbox,
  LogOut,
  ShoppingCart,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  LanguageSwitcher,
  useI18n,
} from "@/lib/i18n";
import { FullScreenLoader } from "@/lib/ui";
import { useRole } from "@/lib/use-auth";

export const Route = createFileRoute("/cashier")({
  head: () => ({
    meta: [
      {
        title: "Cashier · KOB",
      },
      {
        name: "description",
        content:
          "KOB cashier order approval console.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),

  component: CashierLayout,
});

function CashierLayout() {
  const navigate = useNavigate();

  const {
    session,
    role,
    branchId,
    ready,
  } = useRole();

  const { t } = useI18n();

  const [branchName, setBranchName] =
    useState("");

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

    if (role === "cashier") {
      return;
    }

    if (role === "admin") {
      navigate({
        to: "/admin",
      });

      return;
    }

    void supabase.auth
      .signOut()
      .then(() => {
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

  useEffect(() => {
    if (!branchId) {
      setBranchName("");
      return;
    }

    void supabase
      .from("branches")
      .select("name_en,name_ar")
      .eq("id", branchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setBranchName("");
          return;
        }

        setBranchName(
          data.name_en ||
            data.name_ar ||
            "",
        );
      });
  }, [branchId]);

  if (
    !ready ||
    role !== "cashier"
  ) {
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
      <div className="kob-dashboard-layout kob-cashier-layout">
        <aside className="kob-sidebar panel-warm">
          <div className="kob-sidebar-header">
            <Link
              to="/cashier"
              className="kob-sidebar-brand"
            >
              <div className="kob-brand-icon">
                <Coffee className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="kob-brand-title">
                  {t("cashier_title")}
                </div>

                <div className="kob-brand-subtitle">
                  {branchName ||
                    t("cashier_title")}
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
            <CashierSidebarLink
              to="/cashier"
              icon={
                <Inbox className="h-4 w-4" />
              }
              label={t("pending_orders")}
              exact
            />

            <CashierSidebarLink
              to="/cashier/sell-coupon"
              icon={
                <ShoppingCart className="h-4 w-4" />
              }
              label={t("nav_sell_coupon")}
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

type CashierSidebarLinkProps = {
  to:
    | "/cashier"
    | "/cashier/sell-coupon";

  icon: ReactNode;
  label: string;
  exact?: boolean;
};

function CashierSidebarLink({
  to,
  icon,
  label,
  exact = false,
}: CashierSidebarLinkProps) {
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
