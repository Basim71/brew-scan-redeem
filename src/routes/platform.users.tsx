import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, UserPlus } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { listPlatformStaff, type PlatformStaffRow } from "@/services/platform/platform-users.service";
import { Button } from "@/components/kob";

export const Route = createFileRoute("/platform/users")({ component: UsersPage });

function UsersPage() {
  const [rows, setRows] = useState<PlatformStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listPlatformStaff()
      .then((r) => { if (mounted) setRows(r); })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "خطأ"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/users"]}>
    <div className="platform-page" dir="rtl">
      <header className="platform-page-header">
        <div><span>Access Control</span><h1>فريق المنصة</h1><p>موظفو KOB محفوظون في organization_members، وهذه الصفحة تقرأ العرض الموحد فقط.</p></div>
        <Button variant="primary" leadingIcon={<UserPlus className="h-4 w-4" />}>إضافة موظف</Button>
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
    </PlatformGate>
  );
}
