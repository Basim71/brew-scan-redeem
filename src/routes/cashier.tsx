import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Coffee,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/use-auth";
import { FullScreenLoader } from "@/lib/ui";

export const Route = createFileRoute("/cashier")({
  head: () => ({
    meta: [
      {
        title: "Cashier · KOB",
      },
      {
        name: "description",
        content: "KOB cashier order approval console.",
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
  const { session, role, branchId, ready } = useRole();
  const { t } = useI18n();

  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      navigate({ to: "/auth" });
      return;
    }

    if (role === "cashier") return;

    if (role === "admin") {
      navigate({ to: "/admin" });
      return;
    }

    void supabase.auth.signOut().then(() => {
      navigate({ to: "/auth" });
    });
  }, [navigate, ready, role, session]);

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

        setBranchName(data.name_en ?? data.name_ar ?? "");
      });
  }, [branchId]);

  if (!ready || role !== "cashier") {
    return <FullScreenLoader />;
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen w-full p-3 sm:p-5 lg:p-6">
      <div className="grid min-h-[calc(100vh-1.5rem)] w-full gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6">
        <aside className="panel-warm flex min-w-0 flex-col p-3 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:p-4">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1"
            >
              <div className="panel-warm flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <Coffee className="h-5 w-5 text-caramel-bright" />
              </div>

              <div className="min-w-0">
                <div className="truncate font-display font-bold tracking-wide gold-text">
                  {t("cashier_title")}
                </div>

                <div className="truncate text-[10px] uppercase tracking-widest text-cream-dim">
                  {branchName || t("cashier_title")}
                </div>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <LanguageSwitcher />

              <button
                type="button"
                onClick={signOut}
                className="btn-ghost-brass flex items-center justify-center px-3 py-2"
                aria-label={t("signOut")}
                title={t("signOut")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="hairline-divider my-3 hidden lg:block" />

          <nav className="flex min-w-0 gap-2 overflow-x-auto pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
            <NavTab
              to="/cashier"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label={t("nav_dashboard")}
              exact
            />

            <NavTab
              to="/cashier/sell-coupon"
              icon={<ShoppingCart className="h-4 w-4" />}
              label={t("nav_sell_coupon")}
            />
          </nav>

          <div className="mt-auto hidden pt-4 lg:block">
            <div className="hairline-divider mb-4" />

            <div className="flex items-center gap-2">
              <LanguageSwitcher />

              <button
                type="button"
                onClick={signOut}
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

        <section className="min-w-0 pb-4">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

type NavTabProps = {
  to: "/cashier" | "/cashier/sell-coupon";
  icon: ReactNode;
  label: string;
  exact?: boolean;
};

function NavTab({
  to,
  icon,
  label,
  exact = false,
}: NavTabProps) {
  const baseClassName =
    "flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-sm transition lg:w-full";

  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className={`${baseClassName} text-cream-dim hover:bg-white/5 hover:text-caramel-bright`}
      activeProps={{
        className: `${baseClassName} btn-brass`,
      }}
    >
      <span className="shrink-0">
        {icon}
      </span>

      <span className="whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}
