import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, GraduationCap } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { listTraining, type TrainingRow } from "@/services/platform/training.service";

export const Route = createFileRoute("/platform/training")({ component: TrainingPage });

function TrainingPage() {
  const [scope, setScope] = useState<"upcoming" | "past" | "all">("upcoming");
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listTraining(scope)
      .then((r) => { if (alive) { setRows(r); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "خطأ"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scope]);

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/training"]}>
      <div className="platform-page" dir="rtl">
        <header className="platform-page-header">
          <div>
            <span>Training</span>
            <h1>جلسات التدريب</h1>
            <p>متابعة جلسات التدريب المجدولة والمكتملة مع شركاء KOB.</p>
          </div>
          <GraduationCap />
        </header>
        <div className="platform-toolbar">
          <div className="support-tabs">
            {(["upcoming", "past", "all"] as const).map((s) => (
              <button key={s} className={scope === s ? "active" : ""} onClick={() => setScope(s)}>
                <CalendarClock />{s === "upcoming" ? "قادم" : s === "past" ? "سابق" : "الكل"}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="platform-auth-error">{error}</div>}
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead><tr><th>الموضوع</th><th>الشركة</th><th>الموعد</th><th>المدة</th><th>الحالة</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5}>جارٍ التحميل…</td></tr>}
              {!loading && !rows.length && <tr><td colSpan={5}>لا توجد جلسات مطابقة.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.subject}</strong>{r.description && <small>{r.description}</small>}</td>
                  <td>{r.organization?.name_ar || r.organization?.name_en || "—"}</td>
                  <td>{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString("ar-SA") : "—"}</td>
                  <td>{r.duration_minutes} د</td>
                  <td><span className={`platform-status ${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformGate>
  );
}