import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX, canWriteAnnouncements } from "@/features/platform/access";
import { listAnnouncements, type Announcement } from "@/services/platform/announcements.service";
import { usePlatform } from "@/providers/PlatformProvider";

export const Route = createFileRoute("/platform/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const { profile } = usePlatform();
  const [rows, setRows] = useState<Announcement[]>([]);
  const canWrite = canWriteAnnouncements(profile?.role);

  useEffect(() => { void listAnnouncements().then(setRows); }, []);

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/announcements"]}>
      <div className="platform-page" dir="rtl">
        <header className="platform-page-header">
          <div>
            <span>Announcements</span>
            <h1>الإعلانات</h1>
            <p>إعلانات المنصة الموجّهة للشركات والفريق الداخلي.</p>
          </div>
          {canWrite && <button className="platform-primary-button" disabled title="سيتم تفعيل الإرسال بعد اعتماد التخزين"><Plus /> إعلان جديد</button>}
        </header>
        <div className="platform-empty">
          <Bell style={{ display: "inline-block", marginInlineEnd: 8 }} />
          لا توجد إعلانات محفوظة حالياً. سيتم تفعيل الحفظ الدائم عند اعتماد جدول التخزين.
        </div>
        {rows.map((a) => (
          <article key={a.id} className="platform-card">
            <h3>{a.title_ar}</h3>
            <p>{a.body_ar}</p>
            <time>{new Date(a.created_at).toLocaleString("ar-SA")}</time>
          </article>
        ))}
      </div>
    </PlatformGate>
  );
}