import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coffee, LogOut, LayoutDashboard, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { FullScreenLoader } from "@/lib/ui";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/cashier")({
  head: () => ({ meta: [{ title: "Cashier · KOB" }, { name: "description", content: "KOB cashier order approval console." }, { name: "robots", content: "noindex" }] }),
  component: CashierLayout,
});

function CashierLayout() {
  const nav = useNavigate();
  const { session, role, branchId, ready } = useRole();
  const { t } = useI18n();
  const [branchName, setBranchName] = useState<string>("");

  useEffect(() => {
    if (!ready) return;
    if (!session) { nav({ to: "/auth" }); return; }
    if (role === "cashier") return;
    if (role === "admin") { nav({ to: "/admin" }); return; }
    supabase.auth.signOut().then(() => nav({ to: "/auth" }));
  }, [ready, session, role, nav]);

  useEffect(() => {
    if (!branchId) return;
    supabase.from("branches").select("name_en,name_ar").eq("id", branchId).maybeSingle()
      .then(({ data }) => { if (data) setBranchName((data as any).name_en); });
  }, [branchId]);

  if (!ready || role !== "cashier") return <FullScreenLoader />;

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <Link to="/" className="flex items-center gap-3">
            <div className="panel-warm w-11 h-11 rounded-full flex items-center justify-center"><Coffee className="w-5 h-5 text-caramel-bright" /></div>
            <div>
              <div className="font-display font-bold gold-text tracking-wide">{t("cashier_title")}</div>
              <div className="text-[10px] uppercase tracking-widest text-cream-dim">{branchName}</div>
            </div>
          </Link>
          <div className="flex gap-2 items-center">
            <LanguageSwitcher />
            <button onClick={() => supabase.auth.signOut().then(() => nav({ to: "/auth" }))} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /><span className="text-sm hidden sm:inline">{t("signOut")}</span>
            </button>
          </div>
        </div>

        <div className="panel p-1.5 mb-6 inline-flex flex-wrap gap-1">
          <NavTab to="/cashier" icon={<LayoutDashboard className="w-4 h-4" />} label={t("nav_dashboard")} exact />
          <NavTab to="/cashier/sell-coupon" icon={<ShoppingCart className="w-4 h-4" />} label={t("nav_sell_coupon")} />
        </div>

        <Outlet />
      </div>
    </main>
  );
}

function NavTab({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition text-cream-dim hover:text-caramel-bright"
      activeProps={{ className: "px-4 py-2 rounded-lg text-sm flex items-center gap-2 btn-brass" }}
    >
      {icon}{label}
    </Link>
  );
}