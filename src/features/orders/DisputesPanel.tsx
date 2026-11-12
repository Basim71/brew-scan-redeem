import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShieldAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "@/components/kob";

type DisputedOrder = {
  id: string;
  order_number: number | null;
  customer_id: string;
  disputed_at: string | null;
  dispute_handover_at: string | null;
  dispute_handover_by: string | null;
  drink: { name_ar: string; name_en: string } | null;
  customer: { name: string; phone: string } | null;
};

/**
 * Orders the customer reported as "not received". Shown on the cashier
 * screen (one branch) and the owner dashboard (all branches the user can
 * read). Polls, and toasts when a new report arrives.
 */
export function DisputesPanel({ branchId }: { branchId?: string | null }) {
  const { t, lang, fmtNum, fmtDate } = useI18n();
  const isAr = lang === "ar";
  const [rows, setRows] = useState<DisputedOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      let query = supabase
        .from("orders")
        .select(
          "id, order_number, customer_id, disputed_at, dispute_handover_at, dispute_handover_by, drink:drink_types(name_ar,name_en), customer:customers(name,phone)",
        )
        .eq("fulfillment_stage", "disputed")
        .order("disputed_at", { ascending: true })
        .limit(50);
      if (branchId) query = query.eq("branch_id", branchId);
      const { data, error: loadError } = await query;
      if (loadError) return;
      const list = (data ?? []) as unknown as DisputedOrder[];

      if (seen.current) {
        for (const row of list) {
          if (!seen.current.has(row.id)) {
            toast.warning(t("disputes.newDispute", { n: row.order_number ?? "—" }));
          }
        }
      }
      seen.current = new Set(list.map((row) => row.id));
      setRows(list);

      const customerIds = [...new Set(list.map((row) => row.customer_id))];
      if (customerIds.length) {
        const { data: countRows } = await supabase.rpc("cashier_customer_dispute_counts", {
          _customer_ids: customerIds,
        });
        const next: Record<string, number> = {};
        for (const row of countRows ?? []) next[row.customer_id] = row.disputes;
        setCounts(next);
      }
      const staffIds = [...new Set(list.map((row) => row.dispute_handover_by).filter(Boolean))] as string[];
      if (staffIds.length) {
        const { data: people } = await supabase.from("profiles").select("id, full_name, email").in("id", staffIds);
        const next: Record<string, string> = {};
        for (const p of people ?? []) next[p.id] = p.full_name || p.email || "";
        setNames(next);
      }
    } catch {
      // Network blips keep the last good list.
    }
  }, [branchId, t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function resolve(orderId: string, resolution: "refunded" | "picked_up") {
    setBusy(orderId);
    setError(null);
    const { error: rpcError } = await supabase.rpc("cashier_resolve_dispute", {
      _order_id: orderId,
      _resolution: resolution,
    });
    setBusy(null);
    if (rpcError) {
      setError(rpcError.message);
    } else {
      toast.success(t(resolution === "refunded" ? "disputes.refunded" : "disputes.markedDelivered"));
    }
    await load();
  }

  if (!rows.length) return null;

  const time = (value: string | null) =>
    value ? fmtDate(value, { dateStyle: "medium", timeStyle: "short" } as Intl.DateTimeFormatOptions) : "—";

  return (
    <Card tone="raised">
      <CardHeader
        title={t("disputes.title")}
        description={t("disputes.description")}
        icon={<ShieldAlert className="h-4 w-4" />}
      />
      <CardBody>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="kob-queue-grid">
          {rows.map((row) => {
            const previous = counts[row.customer_id] ?? 1;
            return (
              <Card key={row.id} tone="engraved">
                <CardBody>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="error">{t("disputes.order", { n: row.order_number ?? "—" })}</Badge>
                    <Badge tone={previous > 1 ? "warning" : "neutral"}>
                      {t("disputes.previous", { n: fmtNum(previous) })}
                    </Badge>
                  </div>
                  <p className="mt-2 font-semibold">
                    {row.customer?.name ?? t("disputes.unknown")} · {row.customer?.phone ?? ""}
                  </p>
                  <p>{row.drink ? (isAr ? row.drink.name_ar : row.drink.name_en) : ""}</p>
                  <p className="text-sm opacity-80">{t("disputes.reportedAt", { time: time(row.disputed_at) })}</p>
                  <p className="text-sm opacity-80">{t("disputes.handedAt", { time: time(row.dispute_handover_at) })}</p>
                  <p className="text-sm opacity-80">
                    {t("disputes.handedBy", {
                      name: (row.dispute_handover_by && names[row.dispute_handover_by]) || t("disputes.unknown"),
                    })}
                  </p>
                  <div className="kob-queue-actions mt-3">
                    <Button
                      variant="secondary"
                      loading={busy === row.id}
                      disabled={busy === row.id}
                      onClick={() => void resolve(row.id, "refunded")}
                      leadingIcon={<Undo2 className="h-4 w-4" />}
                    >
                      {t("disputes.refund")}
                    </Button>
                    <Button
                      loading={busy === row.id}
                      disabled={busy === row.id}
                      onClick={() => void resolve(row.id, "picked_up")}
                      leadingIcon={<Check className="h-4 w-4" />}
                    >
                      {t("disputes.delivered")}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
