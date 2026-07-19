import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/users")({ component: UsersPage });

function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data, error: queryError } = await (supabase as any)
        .from("platform_staff")
        .select("id,full_name,email,role,status,last_login_at,created_at")
        .order("created_at");
      if (!mounted) return;
      setRows(data ?? []);
      setError(queryError?.message ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="platform-page" dir="rtl">
      <header className="platform-page-header">
        <div><span>Access Control</span><h1>فريق المنصة</h1><p>موظفو KOB محفوظون في organization_members، وهذه الصفحة تقرأ العرض الموحد فقط.</p></div>
        <button className="platform-primary-button" type="button"><UserPlus /> إضافة موظف</button>
      </header>
      {error && <p className="platform-auth-error">تعذر تحميل الفريق: {error}</p>}
      <div className="platform-table-wrap">
        <table className="platform-table">
          <thead><tr><th>الموظف</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4}>جاري التحميل…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={4}>لا يوجد موظفون في منظمة المنصة.</td></tr>}
            {rows.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.full_name}</strong><small>{user.email}</small></td>
                <td><span className="platform-role"><Shield />{user.role}</span></td>
                <td>{user.status}</td>
                <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString("ar-SA") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
