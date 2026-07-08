import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Coffee, LogOut, Plus, Users, Store, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { StatusPill, FullScreenLoader } from "@/lib/ui";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · KOB" }, { name: "description", content: "KOB admin control panel: branches, subscriptions, staff." }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Tab = "overview" | "subs" | "branches" | "staff";

function AdminPage() {
  const nav = useNavigate();
  const { session, role, ready } = useRole();
  const [tab, setTab] = useState<Tab>("overview");
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
        <div className="flex items-center justify-between mb-6">
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
          {([
            ["overview", ClipboardList, t("tab_overview")],
            ["subs", Users, t("tab_subs")],
            ["branches", Store, t("tab_branches")],
            ["staff", Users, t("tab_staff")],
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
  const { t, fmtNum, timeAgo } = useI18n();
  const [stats, setStats] = useState({ subs: 0, branches: 0, pending: 0, approved: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const load = useCallback(async () => {
    const [s, b, p, a, o] = await Promise.all([
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("branches").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("orders").select("id, status, created_at, branch:branches(name_en), drink:drink_types(name_en)").order("created_at", { ascending: false }).limit(10),
    ]);
    setStats({ subs: s.count ?? 0, branches: b.count ?? 0, pending: p.count ?? 0, approved: a.count ?? 0 });
    setRecent(o.data ?? []);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, [load]);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          [t("stat_subs"), stats.subs],
          [t("stat_branches"), stats.branches],
          [t("stat_pending"), stats.pending],
          [t("stat_approved"), stats.approved],
        ].map(([label, v]) => (
          <div key={label as string} className="panel-warm p-5">
            <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim mb-1">{label}</div>
            <div className="font-display gold-text text-4xl font-bold">{fmtNum(v as number)}</div>
          </div>
        ))}
      </div>
      <div className="panel p-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">{t("recent_activity")}</h3>
        <div className="engraved">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="text-start px-4 py-3">{t("col_coffee")}</th><th className="text-start px-4 py-3">{t("col_branch")}</th><th className="text-start px-4 py-3">{t("col_status")}</th><th className="text-end px-4 py-3">{t("col_when")}</th>
            </tr></thead>
            <tbody>{recent.map((r) => (
              <tr key={r.id} className="border-t border-[oklch(0.08_0.02_40)]">
                <td className="px-4 py-3 text-cream">{r.drink?.name_en ?? "—"}</td>
                <td className="px-4 py-3 text-cream-dim">{r.branch?.name_en ?? ""}</td>
                <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                <td className="px-4 py-3 text-end text-cream-dim">{timeAgo(r.created_at)}</td>
              </tr>))}
              {recent.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-cream-dim">{t("empty_orders")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- SUBSCRIPTIONS ---------------- */
function SubsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("subscriptions")
    .select("*, customer:customers(name,phone), plan:plans(name,duration_days), branch:branches(name_en)")
    .order("created_at", { ascending: false }).limit(100)
    .then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="panel p-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">{t("all_subs")}</h3>
        <div className="engraved overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="text-start px-4 py-3">{t("col_phone")}</th><th className="text-start px-4 py-3">{t("col_customer")}</th><th className="text-start px-4 py-3">{t("col_plan")}</th>
              <th className="text-start px-4 py-3">{t("col_branch")}</th><th className="text-end px-4 py-3">{t("col_status")}</th>
            </tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-[oklch(0.08_0.02_40)]">
                <td className="px-4 py-3 font-mono text-cream">{r.customer?.phone ?? ""}</td>
                <td className="px-4 py-3 text-cream-dim">{r.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-cream">{r.plan?.name ?? ""}</td>
                <td className="px-4 py-3 text-cream-dim">{r.branch?.name_en ?? ""}</td>
                <td className="px-4 py-3 text-end"><StatusPill s={r.status} /></td>
              </tr>))}
              {rows.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-cream-dim">{t("empty_subs")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- BRANCHES ---------------- */
function BranchesTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name_en: "", name_ar: "", address_en: "" });
  const [busy, setBusy] = useState(false);
  const load = () => supabase.from("branches").select("*").order("name_en").then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("branches").insert({ ...form });
    setBusy(false); setForm({ name_en: "", name_ar: "", address_en: "" }); load();
  }

  return (
    <>
      <div className="panel-warm p-6 mb-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">{t("new_branch")}</h3>
        <form onSubmit={create} className="grid sm:grid-cols-4 gap-3 items-end">
          <FInput label={t("f_name") + " (EN)"} value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} required />
          <FInput label={t("f_name") + " (AR)"} value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} required />
          <FInput label={t("f_address")} value={form.address_en} onChange={(v) => setForm({ ...form, address_en: v })} />
          <button disabled={busy} className="btn-brass py-3 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{t("btn_create")}
          </button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((b) => (
          <div key={b.id} className="panel p-5">
            <div className="flex justify-between items-baseline">
              <div className="font-display text-xl font-bold text-cream">{b.name_en}</div>
              <div className="engraved px-2 py-1 gold-text text-xs">{b.name_ar}</div>
            </div>
            <div className="text-cream-dim text-sm mt-1">{b.address_en ?? ""}</div>
            <div className="hairline-divider my-3" />
            <a href={`/scan?branch=${encodeURIComponent(b.id)}`} className="btn-ghost-brass block text-center text-xs py-2">{t("open_scan_link")}</a>
          </div>
        ))}
        {rows.length === 0 && <div className="panel p-6 text-center text-cream-dim col-span-full">{t("empty_branches")}</div>}
      </div>
    </>
  );
}

/* ---------------- STAFF ---------------- */
function StaffTab() {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: "", role: "cashier", branch_id: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => {
    const [{ data: r }, { data: b }] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, branch_id, branch:branches(name_en)").order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name_en").order("name_en"),
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
        <h3 className="font-display text-xl font-bold text-cream mb-2">{t("assign_role")}</h3>
        <p className="text-cream-dim text-xs mb-4">{t("assign_hint")}</p>
        <form onSubmit={assign} className="grid sm:grid-cols-4 gap-3 items-end">
          <FInput label={t("f_user_id")} value={form.user_id} onChange={(v) => setForm({ ...form, user_id: v })} required />
          <FSelect label={t("f_role")} value={form.role} onChange={(v) => setForm({ ...form, role: v })}
            options={[{ v: "cashier", l: t("role_cashier") }, { v: "admin", l: t("role_admin") }]} />
          <FSelect label={t("f_branch")} value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })}
            options={[{ v: "", l: "—" }, ...branches.map((b) => ({ v: b.id, l: b.name_en }))]} />
          <button disabled={busy} className="btn-brass py-3 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{t("btn_assign")}
          </button>
        </form>
        {msg && <div className="mt-3 engraved p-3 text-sm text-cream-dim">{msg}</div>}
      </div>
      <div className="panel p-6">
        <h3 className="font-display text-xl font-bold text-cream mb-4">{t("staff_members")}</h3>
        <div className="engraved overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-widest text-cream-dim">
              <th className="text-start px-4 py-3">{t("col_user_id")}</th><th className="text-start px-4 py-3">{t("col_role")}</th><th className="text-start px-4 py-3">{t("col_branch")}</th>
            </tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-t border-[oklch(0.08_0.02_40)]">
                <td className="px-4 py-3 font-mono text-xs text-cream-dim">{u.user_id}</td>
                <td className="px-4 py-3"><StatusPill s={u.role} /></td>
                <td className="px-4 py-3 text-cream">{u.branch?.name_en ?? "—"}</td>
              </tr>))}
              {users.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-cream-dim">{t("empty_roles")}</td></tr>}
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