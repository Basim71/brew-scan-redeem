import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShoppingBag, XCircle } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  approveOrder,
  listOrders,
  rejectOrder,
  type OrderRow,
  type OrderStatus,
} from "@/features/company/orders/service";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { lang } = useI18n();
  const isRTL = lang === "ar";
  const [status, setStatus] = useState<OrderStatus>("all");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listOrders(status));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  async function approve(id: string) {
    setBusy(id);
    try { await approveOrder(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Approve failed"); }
    finally { setBusy(null); }
  }
  async function reject(id: string) {
    setBusy(id);
    try { await rejectOrder(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Reject failed"); }
    finally { setBusy(null); }
  }

  const tabs: { key: OrderStatus; label: string }[] = [
    { key: "all", label: isRTL ? "الكل" : "All" },
    { key: "pending", label: isRTL ? "قيد الانتظار" : "Pending" },
    { key: "approved", label: isRTL ? "معتمد" : "Approved" },
    { key: "rejected", label: isRTL ? "مرفوض" : "Rejected" },
  ];

  return (
    <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{isRTL ? "الطلبات اليومية" : "Daily Orders"}</span>
          <h1>{isRTL ? "الطلبات" : "Orders"}</h1>
          <p>{isRTL ? "طلبات المشروبات المرسلة من العملاء." : "Drink orders submitted by customers."}</p>
        </div>
        <button className="company-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {isRTL ? "تحديث" : "Refresh"}
        </button>
      </header>

      <div className="company-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={status === t.key}
            className="company-tab"
            data-active={status === t.key ? "true" : "false"}
            onClick={() => setStatus(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="company-alert error">{error}</div>}

      <div className="company-table-wrap">
        {loading ? (
          <div className="company-skeleton-table">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="company-skeleton-row" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="company-empty">
            <ShoppingBag className="h-6 w-6" />
            <p>{isRTL ? "لا توجد طلبات." : "No orders found."}</p>
          </div>
        ) : (
          <table className="company-table">
            <thead>
              <tr>
                <th>{isRTL ? "العميل" : "Customer"}</th>
                <th>{isRTL ? "المشروب" : "Drink"}</th>
                <th>{isRTL ? "الفرع" : "Branch"}</th>
                <th>{isRTL ? "الحالة" : "Status"}</th>
                <th>{isRTL ? "الوقت" : "Time"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.customer?.name || "—"}</strong>
                    {o.customer?.phone && <small dir="ltr" style={{ display: "block", opacity: 0.7 }}>{o.customer.phone}</small>}
                  </td>
                  <td>{isRTL ? o.drink?.name_ar : o.drink?.name_en}</td>
                  <td>{isRTL ? o.branch?.name_ar : o.branch?.name_en}</td>
                  <td>
                    <span className={`company-status ${o.status}`}>{
                      o.status === "pending" ? (isRTL ? "قيد الانتظار" : "Pending") :
                      o.status === "approved" ? (isRTL ? "معتمد" : "Approved") :
                      o.status === "rejected" ? (isRTL ? "مرفوض" : "Rejected") :
                      o.status
                    }</span>
                  </td>
                  <td>{new Date(o.created_at).toLocaleString(isRTL ? "ar-SA" : "en-US")}</td>
                  <td>
                    {o.status === "pending" && (
                      <div className="company-row-actions">
                        <button className="company-btn-approve" disabled={busy === o.id} onClick={() => void approve(o.id)}>
                          <CheckCircle2 className="h-4 w-4" />{isRTL ? "قبول" : "Approve"}
                        </button>
                        <button className="company-btn-reject" disabled={busy === o.id} onClick={() => void reject(o.id)}>
                          <XCircle className="h-4 w-4" />{isRTL ? "رفض" : "Reject"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}