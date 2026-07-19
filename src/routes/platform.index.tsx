import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CircleAlert, Headphones, Radio, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/" as any)({ component: Dashboard });

type Metrics = {
  companies: number;
  active: number;
  customers: number;
  pending: number;
  live: number;
  staff: number;
};

const EMPTY: Metrics = { companies: 0, active: 0, customers: 0, pending: 0, live: 0, staff: 0 };

function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const db = supabase as any;
      const [companies, activeCompanies, customers, pendingCases, activeCases, platformStaff] = await Promise.all([
        db.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "company"),
        db.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "company").eq("status", "active"),
        db.from("customers").select("id", { count: "exact", head: true }),
        db.from("customer_success_cases").select("id", { count: "exact", head: true }).in("status", ["new", "triaged", "assigned", "waiting_platform"]),
        db.from("customer_success_cases").select("id", { count: "exact", head: true }).eq("status", "active"),
        db.from("platform_staff").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      if (!mounted) return;
      const firstError = [companies, activeCompanies, customers, pendingCases, activeCases, platformStaff].find((result) => result.error)?.error;
      setMetrics({
        companies: companies.count ?? 0,
        active: activeCompanies.count ?? 0,
        customers: customers.count ?? 0,
        pending: pendingCases.count ?? 0,
        live: activeCases.count ?? 0,
        staff: platformStaff.count ?? 0,
      });
      setLoadError(firstError?.message ?? null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    ["إجمالي الشركات", metrics.companies, Building2],
    ["الشركات النشطة", metrics.active, ShieldCheck],
    ["إجمالي العملاء", metrics.customers, Users],
    ["حالات بانتظار الفريق", metrics.pending, CircleAlert],
    ["حالات نشطة", metrics.live, Radio],
    ["فريق المنصة", metrics.staff, Headphones],
  ] as const;

  return (
    <div className="platform-page" dir="rtl">
      <header className="platform-page-header">
        <div>
          <span>Platform Intelligence</span>
          <h1>إدارة منظومة KOB</h1>
          <p>نظرة مركزية على الشركات وCustomer Success والتشغيل.</p>
        </div>
        <div className="platform-live-pill"><i /> النظام متصل</div>
      </header>

      {loadError && <p className="platform-auth-error">تعذر تحميل بعض مؤشرات المنصة: {loadError}</p>}

      <div className="platform-metrics">
        {cards.map(([label, value, Icon]) => (
          <article key={label}>
            <div><Icon /></div>
            <span>{label}</span>
            <strong>{loading ? "—" : value.toLocaleString("ar-SA")}</strong>
          </article>
        ))}
      </div>

      <section className="platform-feature-grid">
        <article><Headphones /><div><h2>Customer Success</h2><p>الحالات الجديدة والمجدولة والنشطة في مكان واحد.</p></div></article>
        <article><ShieldCheck /><div><h2>وصول محكوم بالموافقة</h2><p>لا يبدأ الدعم أي جلسة أو صلاحية مؤقتة دون موافقة ممثل الشركة.</p></div></article>
      </section>
    </div>
  );
}
