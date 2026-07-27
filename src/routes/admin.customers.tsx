import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { listCustomers, type CustomerRow } from "@/features/company/customers/service";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listCustomers());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.phone}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{isRTL ? "قاعدة العملاء" : "Customer Base"}</span>
          <h1>{isRTL ? "العملاء" : "Customers"}</h1>
          <p>{isRTL ? "قائمة عملاء المقهى وأرقام هواتفهم." : "Coffee shop customers and their phone numbers."}</p>
        </div>
        <button className="company-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {isRTL ? "تحديث" : "Refresh"}
        </button>
      </header>

      <div className="company-toolbar">
        <label className="company-search">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? "ابحث بالاسم أو الهاتف…" : "Search by name or phone…"}
          />
        </label>
        <span className="company-badge">{fmtNum(rows.length)} {isRTL ? "عميل" : "customers"}</span>
      </div>

      {error && <div className="company-alert error">{error}</div>}

      <div className="company-table-wrap">
        {loading ? (
          <div className="company-skeleton-table">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="company-skeleton-row" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="company-empty">
            <Users className="h-6 w-6" />
            <p>{isRTL ? "لا يوجد عملاء بعد." : "No customers yet."}</p>
          </div>
        ) : (
          <table className="company-table">
            <thead>
              <tr>
                <th>{isRTL ? "الاسم" : "Name"}</th>
                <th>{isRTL ? "الهاتف" : "Phone"}</th>
                <th>{isRTL ? "اشتراكات نشطة" : "Active Subs"}</th>
                <th>{isRTL ? "منذ" : "Since"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td dir="ltr"><code>{c.phone}</code></td>
                  <td>{fmtNum(c.active_subscriptions ?? 0)}</td>
                  <td>{new Date(c.created_at).toLocaleDateString(isRTL ? "ar-SA" : "en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}