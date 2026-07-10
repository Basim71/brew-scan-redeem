import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Ticket, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Coupon = {
  id: string; code: string; plan_id: string; branch_id: string | null; price: number;
};
type Plan = { id: string; name: string; duration_days: number };
type Branch = { id: string; name_en: string; name_ar: string };

function todayLocalISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SAUDI_PHONE = /^05\d{8}$/;

export function SellCouponForm({ cashierBranchId }: { cashierBranchId?: string | null }) {
  const { t, lang } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmAdd, setConfirmAdd] = useState(false);

  const [form, setForm] = useState({
    coupon_id: "",
    customer_name: "",
    phone: "",
    start_date: todayLocalISO(),
    branch_id: "",
  });

  const isCashier = Boolean(cashierBranchId);

  const load = useCallback(async () => {
    setLoading(true);
    let cq = supabase.from("coupons").select("id,code,plan_id,branch_id,price").eq("status", "available").order("created_at", { ascending: false });
    if (cashierBranchId) cq = cq.eq("branch_id", cashierBranchId);
    const [c, p, b] = await Promise.all([
      cq,
      supabase.from("plans").select("id,name,duration_days"),
      supabase.from("branches").select("id,name_en,name_ar").eq("is_active", true).order("name_en"),
    ]);
    if (c.error) toast.error(c.error.message);
    setCoupons((c.data as Coupon[]) ?? []);
    setPlans((p.data as Plan[]) ?? []);
    setBranches((b.data as Branch[]) ?? []);
    setLoading(false);
  }, [cashierBranchId]);

  useEffect(() => { load(); }, [load]);

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const selectedCoupon = coupons.find((c) => c.id === form.coupon_id) ?? null;
  const selectedPlan = selectedCoupon ? planMap.get(selectedCoupon.plan_id) ?? null : null;
  const needsBranchPick = Boolean(selectedCoupon && !selectedCoupon.branch_id && !cashierBranchId);
  const effectiveBranchId = cashierBranchId ?? selectedCoupon?.branch_id ?? form.branch_id ?? "";

  const endDate = selectedPlan && form.start_date
    ? addDays(form.start_date, selectedPlan.duration_days - 1)
    : "";

  function validate(): string | null {
    if (!selectedCoupon || !selectedPlan) return t("sell_err_coupon");
    if (!form.customer_name.trim()) return t("sell_err_customer");
    if (!SAUDI_PHONE.test(form.phone.trim())) return t("sell_err_phone");
    if (!form.start_date) return t("sell_err_start");
    if (needsBranchPick && !form.branch_id) return t("sell_err_branch");
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    // Check active subscription
    const phone = form.phone.trim();
    const { data: existingCust } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
    if (existingCust) {
      const { data: activeSub } = await supabase
        .from("subscriptions").select("id").eq("customer_id", existingCust.id).eq("status", "active").limit(1).maybeSingle();
      if (activeSub && !confirmAdd) {
        setConfirmAdd(true);
        return;
      }
    }

    await doSell();
  }

  async function doSell() {
    if (!selectedCoupon || !selectedPlan) return;
    setBusy(true);
    try {
      const phone = form.phone.trim();
      const name = form.customer_name.trim();
      const start_date = form.start_date;
      const end_date = addDays(start_date, selectedPlan.duration_days - 1);
      const branch_id = effectiveBranchId;
      if (!branch_id) throw new Error(t("sell_err_branch"));

      // Upsert customer by phone
      let customer_id: string;
      const { data: cust } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
      if (cust) {
        customer_id = cust.id;
        await supabase.from("customers").update({ name }).eq("id", customer_id);
      } else {
        const ins = await supabase.from("customers").insert({ phone, name }).select("id").single();
        if (ins.error) throw ins.error;
        customer_id = ins.data.id;
      }

      // Create subscription
      const subIns = await supabase.from("subscriptions").insert({
        customer_id,
        coupon_id: selectedCoupon.id,
        plan_id: selectedPlan.id,
        branch_id,
        start_date,
        end_date,
        status: "active",
      });
      if (subIns.error) throw subIns.error;

      // Mark coupon sold
      const cUpd = await supabase.from("coupons")
        .update({ status: "sold", sold_at: new Date().toISOString(), branch_id })
        .eq("id", selectedCoupon.id);
      if (cUpd.error) throw cUpd.error;

      toast.success(t("sell_success"));
      setForm({ coupon_id: "", customer_name: "", phone: "", start_date: todayLocalISO(), branch_id: "" });
      setConfirmAdd(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="panel-warm w-10 h-10 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-caramel-bright" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-cream leading-tight">{t("sell_title")}</h1>
          <div className="text-[10px] uppercase tracking-widest text-cream-dim">{t("sell_subtitle")}</div>
        </div>
      </div>

      <form onSubmit={submit} className="panel-warm p-6 space-y-4 max-w-xl">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-cream-dim">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <>
            <Field label={t("sell_field_coupon")}>
              <div className="inset-well flex items-center gap-2 px-3">
                <Ticket className="w-4 h-4 text-cream-dim shrink-0" />
                <select required value={form.coupon_id}
                  onChange={(e) => setForm({ ...form, coupon_id: e.target.value, branch_id: "" })}
                  className="w-full bg-transparent py-2.5 outline-none text-cream">
                  <option value="">{coupons.length === 0 ? t("sell_no_available") : t("sell_pick_coupon")}</option>
                  {coupons.map((c) => {
                    const plan = planMap.get(c.plan_id);
                    const branch = c.branch_id ? branchMap.get(c.branch_id) : null;
                    const branchLabel = branch ? (lang === "ar" ? branch.name_ar : branch.name_en) : t("coupons_any_branch");
                    return (
                      <option key={c.id} value={c.id}>
                        {c.code} · {plan?.name ?? "—"} · {branchLabel}
                      </option>
                    );
                  })}
                </select>
              </div>
            </Field>

            {needsBranchPick && (
              <Field label={t("sell_field_branch")}>
                <select required value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  className="inset-well w-full px-3 py-2.5 outline-none">
                  <option value="">{t("sell_pick_branch")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label={t("sell_field_customer")}>
              <input required maxLength={100} value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>

            <Field label={t("sell_field_phone")}>
              <input required inputMode="numeric" pattern="05\d{8}" maxLength={10}
                placeholder="05XXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                className="inset-well w-full px-3 py-2.5 outline-none font-mono focus:ring-2 focus:ring-caramel/60" />
              <div className="text-[10px] text-cream-dim mt-1">{t("sell_phone_hint")}</div>
            </Field>

            <Field label={t("sell_field_start")}>
              <input required type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="inset-well w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>

            {selectedPlan && endDate && (
              <div className="engraved p-3 flex items-center justify-between text-xs">
                <span className="text-cream-dim uppercase tracking-widest">{selectedPlan.name} · {selectedPlan.duration_days} {t("plans_days")}</span>
                <span className="gold-text font-mono">→ {endDate}</span>
              </div>
            )}

            <button disabled={busy || coupons.length === 0}
              className="btn-brass w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              {t("sell_btn")}
            </button>
          </>
        )}
      </form>

      {confirmAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !busy && setConfirmAdd(false)}>
          <div className="panel-warm p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-bold text-cream mb-2">{t("sell_active_title")}</h2>
            <p className="text-cream-dim text-sm mb-5">{t("sell_active_body")}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAdd(false)} disabled={busy}
                className="btn-ghost-brass flex-1 py-3">{t("btn_cancel")}</button>
              <button onClick={doSell} disabled={busy}
                className="btn-brass flex-1 py-3 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("sell_add_another")}
              </button>
            </div>
          </div>
        </div>
      )}
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