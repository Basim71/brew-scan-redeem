import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Coffee, LogOut, Plus, Users, Store, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { StatusPill, timeAgo, FullScreenLoader } from "@/lib/ui";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · KOB" }, { name: "description", content: "KOB admin control panel: branches, subscriptions, staff." }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Tab = "overview" | "subs" | "branches" | "staff";

function AdminPage() {
  const nav = useNavigate();
  const { session, role, ready } = useRole();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!ready) return;
    if (!session) { nav({ to: "/auth" }); return; }
    if (role !== "admin") { nav({ to: role === "cashier" ? "/cashier" : "/" }); return; }
  }, [ready, session, role, nav]);

  if (!ready || role !== "admin") return <FullScreenLoader />;

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="panel-warm w-11 h-11 rounded-full flex items-center justify-center"><Coffee className="w-5 h-5 text-caramel-bright" /></div>
            <div>
              <div className="font-display font-bold gold-text tracking-wide">KOB · Admin</div>
              <div className="text-[10px] uppercase tracking-widest text-cream-dim">Control Panel</div>
            </div>
          </Link>
          <button onClick={() => supabase.auth.signOut().then(() => nav({ to: "/auth" }))} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /><span className="text-sm hidden sm:inline">Sign out</span>
          </button>
        </div>

        <div className="panel p-1.5 mb-6 inline-flex flex-wrap gap-1">
          {([
            ["overview", ClipboardList, "Overview"],
            ["subs", Users, "Subscriptions"],
            ["branches", Store, "Branches"],
            ["staff", Users, "Staff"],
          ] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={"px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition " +
                (tab === k ? "btn-brass" : "text-cream-dim hover:text-caramel-bright")}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview />}
        {tab === "subs" && <SubsTab />}
        {tab === "branches" && <BranchesTab />}
        {tab === "staff" && <StaffTab />}
      </div>
    </main>
  );
}

/* ---------------- OVERVIEW ---------------- */
function Overview() {
  const [stats, setStats] = useState({ subs: 0, branches: 0, pending: 0, approved: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const load = useCallback(async () => {
    const [s, b, p, a, o] = await Promise.all([
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("branches").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("orders").select("id, coffee_name, status, created_at, branch:branches(name)").order("created_at", { ascending: false }).limit(10),
    ]);
    setStats({ subs: s.count ?? 0, branches: b.count ?? 0, pending: p.count ?? 0, approved: a.count ?? 0 });
    setRecent(o.data ?? []);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, [load]);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ["Active Subscriptions", stats.subs],
          ["Branches", stats.branches],
          ["Pending Orders", stats.pending],
          ["Approved Today+", stats.approved],
        ].map(([label, v]) => (
          <div key={label as string} className="panel-warm p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim mb-1">{label}</div>
            <div className="font-display gold-text text-4xl font-bold">{v as number}</div>
          </div>
        ))}
      </div>
      <div className="panel p-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">Recent Activity</h3>
        <div className="engraved">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="text-left px-4 py-3">Coffee</th><th className="text-left px-4 py-3">Branch</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">When</th>
            </tr></thead>
            <tbody>{recent.map((r) => (
              <tr key={r.id} className="border-t border-[oklch(0.08_0.02_40)]">
                <td className="px-4 py-3 text-cream">{r.coffee_name}</td>
                <td className="px-4 py-3 text-cream-dim">{r.branch?.name}</td>
                <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                <td className="px-4 py-3 text-right text-cream-dim">{timeAgo(r.created_at)}</td>
              </tr>))}
              {recent.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-cream-dim">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- SUBSCRIPTIONS ---------------- */
function SubsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ phone: "", customer_name: "", plan_name: "30-Day Coffee Pass", days_total: 30 });
  const [busy, setBusy] = useState(false);
  const load = () => supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("subscriptions").insert({ ...form, days_total: Number(form.days_total), expires_at: new Date(Date.now() + Number(form.days_total) * 86400000).toISOString() });
    setBusy(false);
    setForm({ phone: "", customer_name: "", plan_name: "30-Day Coffee Pass", days_total: 30 });
    load();
  }

  return (
    <>
      <div className="panel-warm p-6 mb-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">New Subscription</h3>
        <form onSubmit={create} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <FInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
          <FInput label="Customer" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} />
          <FInput label="Plan" value={form.plan_name} onChange={(v) => setForm({ ...form, plan_name: v })} required />
          <FInput label="Days" type="number" value={String(form.days_total)} onChange={(v) => setForm({ ...form, days_total: Number(v) })} required />
          <button disabled={busy} className="btn-brass py-3 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create
          </button>
        </form>
      </div>
      <div className="panel p-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">All Subscriptions</h3>
        <div className="engraved overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Plan</th>
              <th className="text-right px-4 py-3">Used</th><th className="text-right px-4 py-3">Total</th><th className="text-right px-4 py-3">Status</th>
            </tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-[oklch(0.08_0.02_40)]">
                <td className="px-4 py-3 font-mono text-cream">{r.phone}</td>
                <td className="px-4 py-3 text-cream-dim">{r.customer_name ?? "—"}</td>
                <td className="px-4 py-3 text-cream">{r.plan_name}</td>
                <td className="px-4 py-3 text-right gold-text font-mono">{r.days_used}</td>
                <td className="px-4 py-3 text-right text-cream-dim font-mono">{r.days_total}</td>
                <td className="px-4 py-3 text-right"><StatusPill s={r.active ? "active" : "inactive"} /></td>
              </tr>))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-cream-dim">No subscriptions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- BRANCHES ---------------- */
function BranchesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", code: "", address: "" });
  const [busy, setBusy] = useState(false);
  const load = () => supabase.from("branches").select("*").order("name").then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("branches").insert({ ...form, code: form.code.toUpperCase() });
    setBusy(false); setForm({ name: "", code: "", address: "" }); load();
  }

  return (
    <>
      <div className="panel-warm p-6 mb-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">New Branch</h3>
        <form onSubmit={create} className="grid sm:grid-cols-4 gap-3 items-end">
          <FInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <FInput label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} required />
          <FInput label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <button disabled={busy} className="btn-brass py-3 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create
          </button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((b) => (
          <div key={b.id} className="panel p-5">
            <div className="flex justify-between items-baseline">
              <div className="font-display text-xl font-bold text-cream">{b.name}</div>
              <div className="engraved px-2 py-1 font-mono gold-text text-xs">{b.code}</div>
            </div>
            <div className="text-cream-dim text-sm mt-1">{b.address ?? ""}</div>
            <div className="hairline-divider my-3" />
            <a href={`/scan?code=${encodeURIComponent(b.code)}`} className="btn-ghost-brass block text-center text-xs py-2">Open Scan Link</a>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- STAFF ---------------- */
function StaffTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: "", role: "cashier", branch_id: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => {
    const [{ data: r }, { data: b }] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, branch_id, branch:branches(name)").order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    setUsers(r ?? []); setBranches(b ?? []);
  };
  useEffect(() => { load(); }, []);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.from("user_roles").insert({
      user_id: form.user_id.trim(), role: form.role as any, branch_id: form.branch_id || null,
    });
    setBusy(false);
    if (error) setMsg(error.message); else { setMsg("Assigned."); setForm({ user_id: "", role: "cashier", branch_id: "" }); load(); }
  }

  return (
    <>
      <div className="panel-warm p-6 mb-6">
        <h3 className="font-display text-xl font-bold text-cream mb-2">Assign Role</h3>
        <p className="text-cream-dim text-xs mb-4">The user must first sign up on the /auth page. Copy their user ID from the Cloud Users panel.</p>
        <form onSubmit={assign} className="grid sm:grid-cols-4 gap-3 items-end">
          <FInput label="User ID (UUID)" value={form.user_id} onChange={(v) => setForm({ ...form, user_id: v })} required />
          <FSelect label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })}
            options={[{ v: "cashier", l: "Cashier" }, { v: "admin", l: "Admin" }]} />
          <FSelect label="Branch (cashier)" value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })}
            options={[{ v: "", l: "—" }, ...branches.map((b) => ({ v: b.id, l: b.name }))]} />
          <button disabled={busy} className="btn-brass py-3 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Assign
          </button>
        </form>
        {msg && <div className="mt-3 engraved p-3 text-sm text-cream-dim">{msg}</div>}
      </div>
      <div className="panel p-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">Staff Members</h3>
        <div className="engraved overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="text-left px-4 py-3">User ID</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Branch</th>
            </tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-t border-[oklch(0.08_0.02_40)]">
                <td className="px-4 py-3 font-mono text-xs text-cream-dim">{u.user_id}</td>
                <td className="px-4 py-3"><StatusPill s={u.role} /></td>
                <td className="px-4 py-3 text-cream">{u.branch?.name ?? "—"}</td>
              </tr>))}
              {users.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-cream-dim">No roles assigned yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- Fields ---------------- */
function FInput({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-cream-dim mb-1.5">{label}</div>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60" />
    </label>
  );
}
function FSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-cream-dim mb-1.5">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}