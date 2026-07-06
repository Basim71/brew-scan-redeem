import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Coffee, Check, X, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { StatusPill, timeAgo, FullScreenLoader } from "@/lib/ui";

export const Route = createFileRoute("/cashier")({
  head: () => ({ meta: [{ title: "Cashier · KOB" }, { name: "description", content: "KOB cashier order approval console." }, { name: "robots", content: "noindex" }] }),
  component: CashierPage,
});

type Order = {
  id: string; coffee_name: string; language: string; status: string; created_at: string;
  subscription: { phone: string; customer_name: string | null; days_total: number; days_used: number } | null;
};

function CashierPage() {
  const nav = useNavigate();
  const { session, role, branchId, ready } = useRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [branchName, setBranchName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!session) { nav({ to: "/auth" }); return; }
    if (role !== "cashier") { nav({ to: role === "admin" ? "/admin" : "/" }); return; }
  }, [ready, session, role, nav]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const [{ data: b }, { data: o }] = await Promise.all([
      supabase.from("branches").select("name").eq("id", branchId).maybeSingle(),
      supabase.from("orders")
        .select("id, coffee_name, language, status, created_at, subscription:subscriptions(phone, customer_name, days_total, days_used)")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (b) setBranchName(b.name);
    setOrders((o as any) ?? []);
    setLoading(false);
  }, [branchId]);

  useEffect(() => { if (branchId) load(); }, [branchId, load]);

  // Realtime-ish polling
  useEffect(() => {
    if (!branchId) return;
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [branchId, load]);

  async function decide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    await supabase.from("orders").update({ status }).eq("id", id);
    setBusyId(null);
    load();
  }

  if (!ready) return <FullScreenLoader />;
  if (!branchId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="panel-warm p-8 max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-cream mb-2">No branch assigned</h1>
          <p className="text-cream-dim text-sm mb-6">Ask an admin to assign your account to a branch.</p>
          <button onClick={() => supabase.auth.signOut().then(() => nav({ to: "/auth" }))} className="btn-ghost-brass px-5 py-2.5">Sign out</button>
        </div>
      </main>
    );
  }

  const pending = orders.filter((o) => o.status === "pending");
  const recent = orders.filter((o) => o.status !== "pending").slice(0, 20);

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <TopBar branchName={branchName} onSignOut={() => supabase.auth.signOut().then(() => nav({ to: "/auth" }))} onRefresh={load} loading={loading} />

        <div className="panel-warm p-6 mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-cream">Pending Orders</h2>
            <span className="engraved px-3 py-1 font-mono gold-text text-sm">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <div className="engraved p-8 text-center text-cream-dim text-sm">All caught up. The queue is empty.</div>
          ) : (
            <div className="space-y-3">
              {pending.map((o) => (
                <div key={o.id} className="engraved p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="panel w-14 h-14 rounded-full flex items-center justify-center">
                      <Coffee className="w-6 h-6 text-caramel-bright" />
                    </div>
                    <div>
                      <div className="font-display text-xl font-semibold text-cream">{o.coffee_name}</div>
                      <div className="text-xs text-cream-dim font-mono">{o.subscription?.phone} · {o.subscription?.customer_name ?? "—"}</div>
                      <div className="text-[10px] uppercase tracking-widest text-cream-dim mt-1">
                        {o.subscription ? `${o.subscription.days_total - o.subscription.days_used}/${o.subscription.days_total} left` : ""} · {timeAgo(o.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={busyId === o.id} onClick={() => decide(o.id, "rejected")}
                      className="btn-ghost-brass px-4 py-2.5 flex items-center gap-1.5"><X className="w-4 h-4" />Reject</button>
                    <button disabled={busyId === o.id} onClick={() => decide(o.id, "approved")}
                      className="btn-brass px-5 py-2.5 flex items-center gap-1.5">
                      {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="font-display text-xl font-bold text-cream mb-4">Recent</h2>
          <div className="engraved">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-cream-dim">
                  <th className="text-left px-4 py-3">Coffee</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-[oklch(0.08_0.02_40)]">
                    <td className="px-4 py-3 text-cream">{o.coffee_name}</td>
                    <td className="px-4 py-3 font-mono text-cream-dim text-xs">{o.subscription?.phone ?? ""}</td>
                    <td className="px-4 py-3"><StatusPill s={o.status} /></td>
                    <td className="px-4 py-3 text-right text-cream-dim">{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-cream-dim py-6">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function TopBar({ branchName, onSignOut, onRefresh, loading }: { branchName: string; onSignOut: () => void; onRefresh: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Link to="/" className="flex items-center gap-3">
        <div className="panel-warm w-11 h-11 rounded-full flex items-center justify-center"><Coffee className="w-5 h-5 text-caramel-bright" /></div>
        <div>
          <div className="font-display font-bold gold-text tracking-wide">KOB · Cashier</div>
          <div className="text-[10px] uppercase tracking-widest text-cream-dim">{branchName}</div>
        </div>
      </Link>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="btn-ghost-brass px-3 py-2"><RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} /></button>
        <button onClick={onSignOut} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5"><LogOut className="w-4 h-4" /><span className="text-sm hidden sm:inline">Sign out</span></button>
      </div>
    </div>
  );
}
