import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  Button,
  StatusBadge,
  type StatusTone,
  SearchInput,
  Select,
  Input,
  FormDialog,
  LoadingState,
  EmptyState,
  NoResultsState,
  Pagination,
} from "@/components/kob";

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
});

type CouponStatus = "available" | "sold" | "expired";
type Plan = { id: string; name: string; price: number };
type Branch = { id: string; name_en: string; name_ar: string };
type Coupon = {
  id: string;
  code: string;
  plan_id: string;
  branch_id: string | null;
  price: number;
  status: CouponStatus;
  created_at: string;
};

const PAGE_SIZE = 20;
const FILTERS: (CouponStatus | "all")[] = ["all", "available", "sold", "expired"];
const STATUS_TONE: Record<string, StatusTone> = {
  available: "success",
  sold: "neutral",
  expired: "error",
};

/** Coupon code format: PS-AB12C-DE34 (prefix from plan + 2 random alnum segments) */
function makeCode(planName: string): string {
  const alnum = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/1/O/I
  const rand = (n: number) => Array.from({ length: n }, () => alnum[Math.floor(Math.random() * alnum.length)]).join("");
  const prefix = (planName.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2) || "PS").padEnd(2, "S");
  return `${prefix}-${rand(5)}-${rand(4)}`;
}

function CouponsPage() {
  const { t, lang, fmtNum, fmtDate } = useI18n();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CouponStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [batchOpen, setBatchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ plan_id: "", branch_id: "", quantity: "10" });

  const load = useCallback(async () => {
    setLoading(true);
    const [c, p, b] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id,name,price").order("name"),
      supabase.from("branches").select("id,name_en,name_ar").order("name_en"),
    ]);
    if (c.error) toast.error(c.error.message);
    setRows((c.data as Coupon[]) ?? []);
    setPlans((p.data as Plan[]) ?? []);
    setBranches((b.data as Branch[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const branchName = (id: string | null) => {
    if (!id) return t("coupons_all_branches");
    const b = branchMap.get(id);
    return b ? (lang === "ar" ? b.name_ar : b.name_en) : "—";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !r.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  useEffect(() => { setPage(1); }, [filter, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openBatch() {
    setForm({ plan_id: plans[0]?.id ?? "", branch_id: "", quantity: "10" });
    setBatchOpen(true);
  }

  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    const plan = planMap.get(form.plan_id);
    if (!plan) return toast.error(t("coupons_err_plan"));
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) return toast.error(t("coupons_err_qty"));

    setBusy(true);
    const seen = new Set<string>();
    const rowsToInsert: Array<{ code: string; plan_id: string; branch_id: string | null; price: number }> = [];
    while (rowsToInsert.length < qty) {
      const code = makeCode(plan.name);
      if (seen.has(code)) continue;
      seen.add(code);
      rowsToInsert.push({
        code,
        plan_id: plan.id,
        branch_id: form.branch_id || null,
        price: plan.price,
      });
    }
    const { error } = await supabase.from("coupons").insert(rowsToInsert);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("coupons_created", { n: fmtNum(qty) }));
    setBatchOpen(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="panel-warm w-10 h-10 rounded-full flex items-center justify-center">
            <Ticket className="w-5 h-5 text-caramel-bright" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-cream leading-tight">{t("coupons_title")}</h1>
            <div className="text-[10px] uppercase tracking-widest text-cream-dim">{t("coupons_subtitle")}</div>
          </div>
        </div>
        <Button onClick={openBatch} leadingIcon={<Plus className="w-4 h-4" />}>
          {t("coupons_new_batch")}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="panel p-1.5 inline-flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition " +
                (filter === f ? "btn-brass" : "text-cream-dim hover:text-caramel-bright")
              }
            >
              {f === "all" ? t("coupons_filter_all") : t(`st_${f}` as any)}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("coupons_search")} />
        </div>
      </div>

      {loading ? (
        <div className="panel-warm p-12">
          <LoadingState />
        </div>
      ) : rows.length === 0 ? (
        <div className="panel-warm p-12">
          <EmptyState
            description={t("coupons_empty")}
            action={
              <Button onClick={openBatch} leadingIcon={<Plus className="w-4 h-4" />}>
                {t("coupons_new_batch")}
              </Button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-warm p-12">
          <NoResultsState description={t("coupons_empty_filtered")} />
        </div>
      ) : (
        <>
          <div className="engraved overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.2em] text-cream-dim">
                  <Th>{t("coupons_col_code")}</Th>
                  <Th>{t("coupons_col_plan")}</Th>
                  <Th>{t("coupons_col_price")}</Th>
                  <Th>{t("coupons_col_branch")}</Th>
                  <Th>{t("coupons_col_status")}</Th>
                  <Th>{t("coupons_col_created")}</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c.id} className="border-t border-[oklch(0.25_0.03_60)]/40">
                    <Td>
                      <span className="font-mono text-caramel-bright tracking-wider">{c.code}</span>
                    </Td>
                    <Td>{planMap.get(c.plan_id)?.name ?? "—"}</Td>
                    <Td className="gold-text font-semibold">{fmtNum(Number(c.price))}</Td>
                    <Td>{branchName(c.branch_id)}</Td>
                    <Td><StatusBadge tone={STATUS_TONE[c.status] ?? "neutral"}>{t(`st_${c.status}` as any)}</StatusBadge></Td>
                    <Td className="text-cream-dim">{fmtDate(c.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} total={filtered.length} />
        </>
      )}

      <FormDialog
        open={batchOpen}
        onClose={() => !busy && setBatchOpen(false)}
        title={t("coupons_batch_title")}
        description={t("coupons_batch_hint")}
        onSubmit={generate}
        busy={busy}
        submitLabel={t("coupons_generate")}
        cancelLabel={t("btn_cancel")}
      >
        <Select
          required
          label={t("coupons_field_plan")}
          value={form.plan_id}
          onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
        >
          <option value="">—</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>

        <Select
          label={t("coupons_field_branch")}
          value={form.branch_id}
          onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
        >
          <option value="">{t("coupons_all_branches")}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{lang === "ar" ? b.name_ar : b.name_en}</option>
          ))}
        </Select>

        <Input
          required
          type="number"
          min={1}
          max={500}
          step={1}
          label={t("coupons_field_quantity")}
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
      </FormDialog>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-3 font-semibold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 text-cream " + className}>{children}</td>;
}
