import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { listAudit, type AuditRow } from "@/services/platform/platform-audit.service";

export const Route = createFileRoute("/platform/audit")({ component: AuditPage });

function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAudit(200).then(setRows).catch((e) => setError(e instanceof Error ? e.message : "خطأ"));
  }, []);

  const filtered = rows.filter((r) => !q || `${r.action} ${r.target_type} ${r.target_id}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/audit"]}>
      <div className="platform-page" dir="rtl">
        <header className="platform-page-header">
          <div>
            <span>Audit</span>
            <h1>سجل التدقيق</h1>
            <p>سجل الإجراءات الحساسة على المنصة.</p>
          </div>
          <ScrollText />
        </header>
        <div className="platform-toolbar">
          <label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالإجراء أو الهدف…" /></label>
        </div>
        {error && <div className="platform-auth-error">{error}</div>}
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead><tr><th>الإجراء</th><th>الهدف</th><th>الجلسة</th><th>الفاعل</th><th>الوقت</th></tr></thead>
            <tbody>
              {!filtered.length && <tr><td colSpan={5}>لا توجد أحداث مطابقة.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.action}</strong></td>
                  <td>{r.target_type ? `${r.target_type} · ${r.target_id ?? ""}` : "—"}</td>
                  <td><code>{r.session_id.slice(0, 8)}</code></td>
                  <td><code>{r.actor_user_id.slice(0, 8)}</code></td>
                  <td>{new Date(r.created_at).toLocaleString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformGate>
  );
}