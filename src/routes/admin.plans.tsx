import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, Pencil, Power, PowerOff, Trash2, X, Save, Boxes } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

type Plan = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
};

type FormState = { name: string; duration_days: string; price: string; is_active: boolean };
const EMPTY: FormState = { name: "", duration_days: "", price: "", is_active: true };

function PlansPage() {
  const { t, fmtNum } = useI18n();
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ plan: Plan; action: "delete" | "toggle" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Plan[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(EMPTY); setEditorOpen(true); }
  function openEdit(p: Plan) {
    setEditing(p);
    setForm({ name: p.name, duration_days: String(p.duration_days), price: String(p.price), is_active: p.is_active });
    setEditorOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const duration = Number(form.duration_days);
    const price = Number(form.price);
    if (!name) return toast.error(t("plans_err_name"));
    if (!Number.isInteger(duration) || duration <= 0) return toast.error(t("plans_err_duration"));
    if (!Number.isFinite(price) || price < 0) return toast.error(t("plans_err_price"));

    setBusy(true);
    const payload = { name, duration_days: duration, price, is_active: form.is_active };
    const { error } = editing
      ? await supabase.from("plans").update(payload).eq("id", editing.id)
      : await supabase.from("plans").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? t("plans_updated") : t("plans_created"));
    setEditorOpen(false); setEditing(null); setForm(EMPTY);
    load();
  }

  async function doConfirmed() {
    if (!confirm) return;
    const { plan, action } = confirm;
    setBusy(true);
    if (action === "delete") {
      const { error } = await supabase.from("plans").delete().eq("id", plan.id);
      setBusy(false); setConfirm(null);
      if (error) toast.error(error.message);
      else { toast.success(t("plans_deleted")); load(); }
    } else {
      const { error } = await supabase.from("plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
      setBusy(false); setConfirm(null);
      if (error) toast.error(error.message);
      else { toast.success(plan.is_active ? t("plans_deactivated") : t("plans_activated")); load(); }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="panel-warm w-10 h-10 rounded-full flex items-center justify-center">
            <Boxes className="w-5 h-5 text-caramel-bright" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-cream leading-tight">{t("plans_title")}</h1>
            <div className="text-[10px] uppercase tracking-widest text-cream-dim">{t("plans_subtitle")}</div>
          </div>
        </div>
        <button onClick={openNew} className="btn-brass px-5 py-2.5 flex items-center gap-2">
          <Plus className="w-4 h-4" />{t("plans_new")}
        </button>
      </div>

      {loading ? (
        <div className="panel-warm p-12 flex items-center justify-center text-cream-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="panel-warm p-12 text-center">
          <div className="text-cream-dim text-sm mb-4">{t("plans_empty")}</div>
          <button onClick={openNew} className="btn-brass px-5 py-2.5 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />{t("plans_new")}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="panel-warm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="font-display text-xl font-bold text-cream leading-tight">{p.name}</div>
                <StatusPill s={p.is_active ? "active" : "inactive"} />
              </div>
              <div className="engraved p-4 mb-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-cream-dim">{t("plans_duration")}</span>
                  <span className="font-display gold-text text-xl font-bold">
                    {fmtNum(p.duration_days)} <span className="text-xs text-cream-dim font-sans">{t("plans_days")}</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-cream-dim">{t("plans_price")}</span>
                  <span className="font-display gold-text text-xl font-bold">{fmtNum(Number(p.price))}</span>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <button onClick={() => openEdit(p)} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5 text-sm">
                  <Pencil className="w-3.5 h-3.5" />{t("btn_edit")}
                </button>
                <button onClick={() => setConfirm({ plan: p, action: "toggle" })} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5 text-sm">
                  {p.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  {p.is_active ? t("plans_deactivate") : t("plans_activate")}
                </button>
                <button onClick={() => setConfirm({ plan: p, action: "delete" })} className="btn-ghost-brass px-3 py-2 flex items-center gap-1.5 text-sm text-[oklch(0.75_0.18_32)]">
                  <Trash2 className="w-3.5 h-3.5" />{t("btn_delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <Modal onClose={() => !busy && setEditorOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-2xl font-bold text-cream">
                {editing ? t("plans_edit") : t("plans_new")}
              </h2>
              <button type="button" onClick={() => setEditorOpen(false)} className="btn-ghost-brass w-9 h-9 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Field label={t("plans_field_name")}>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("plans_field_duration")}>
                <input required type="number" min={1} step={1} value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                  className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60" />
              </Field>
              <Field label={t("plans_field_price")}>
                <input required type="number" min={0} step="0.01" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60" />
              </Field>
            </div>
            <label className="engraved px-4 py-3 flex items-center justify-between cursor-pointer">
              <span className="text-sm text-cream">{t("plans_field_active")}</span>
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-[oklch(0.68_0.14_60)]" />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditorOpen(false)} disabled={busy}
                className="btn-ghost-brass flex-1 py-3">{t("btn_cancel")}</button>
              <button disabled={busy} className="btn-brass flex-1 py-3 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("btn_save")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <Modal onClose={() => !busy && setConfirm(null)}>
          <h2 className="font-display text-xl font-bold text-cream mb-2">
            {confirm.action === "delete" ? t("plans_confirm_delete_title") :
              confirm.plan.is_active ? t("plans_confirm_deactivate_title") : t("plans_confirm_activate_title")}
          </h2>
          <p className="text-cream-dim text-sm mb-5">
            {confirm.action === "delete"
              ? t("plans_confirm_delete_body").replace("{name}", confirm.plan.name)
              : (confirm.plan.is_active ? t("plans_confirm_deactivate_body") : t("plans_confirm_activate_body")).replace("{name}", confirm.plan.name)}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(null)} disabled={busy}
              className="btn-ghost-brass flex-1 py-3">{t("btn_cancel")}</button>
            <button onClick={doConfirmed} disabled={busy}
              className="btn-brass flex-1 py-3 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirm.action === "delete" ? t("btn_delete") : (confirm.plan.is_active ? t("plans_deactivate") : t("plans_activate"))}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="panel-warm p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-cream-dim mb-1.5">{label}</div>
      {children}
    </label>
  );
}