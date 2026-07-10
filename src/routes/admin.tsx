import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Coffee, LogOut, LayoutDashboard, Boxes, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { FullScreenLoader } from "@/lib/ui";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · KOB" }, { name: "description", content: "KOB admin control panel." }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const nav = useNavigate();
  const { session, role, ready } = useRole();
  const { t } = useI18n();

  useEffect(() => {
    if (!ready) return;
    if (!session) { nav({ to: "/auth" }); return; }
    if (role === "admin") return;
    if (role === "cashier") { nav({ to: "/cashier" }); return; }
    supabase.auth.signOut().then(() => nav({ to: "/auth" }));
  }, [ready, session, role, nav]);

  if (!ready || role !== "admin") return <FullScreenLoader />;

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <Link to="/" className="flex items-center gap-3">
            <div className="panel-warm w-11 h-11 rounded-full flex items-center justify-center"><Coffee className="w-5 h-5 text-caramel-bright" /></div>
            <div>
              <div className="font-display font-bold gold-text tracking-wide">{t("admin_title")}</div>
              <div className="text-[10px] uppercase tracking-widest text-cream-dim">{t("admin_sub")}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={() => supabase.auth.signOut().then(() => nav({ to: "/auth" }))} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /><span className="text-sm hidden sm:inline">{t("signOut")}</span>
            </button>
          </div>
        </div>

        <div className="panel p-1.5 mb-6 inline-flex flex-wrap gap-1">
          <NavTab to="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label={t("nav_dashboard")} exact />
          <NavTab to="/admin/plans" icon={<Boxes className="w-4 h-4" />} label={t("nav_plans")} />
          <NavTab to="/admin/coupons" icon={<Ticket className="w-4 h-4" />} label={t("nav_coupons")} />
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