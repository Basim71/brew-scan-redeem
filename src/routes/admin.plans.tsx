import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import { listPlans, type Plan } from "@/services/company/plans.service";
import { listDrinks, type DrinkTypeRow } from "@/services/company/drinks.service";
import { listBranches, type BranchRow } from "@/services/company/branches.service";
import { PlanBuilder } from "@/features/company/plans/PlanBuilder";
import { PlanCard } from "@/features/company/plans/PlanCard";
import { S } from "@/features/company/plans/strings";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

function PlansPage() {
  const { lang } = useI18n();
  const { organization } = useOrganization();
  const [rows, setRows] = useState<Plan[]>([]);
  const [drinks, setDrinks] = useState<DrinkTypeRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, b] = await Promise.all([listPlans(), listDrinks(), listBranches()]);
      setRows(p);
      setDrinks(d);
      setBranches(b);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => rows.filter((r) => !r.archived_at), [rows]);
  const archived = useMemo(() => rows.filter((r) => r.archived_at), [rows]);

  function openNew() {
    setEditing(null);
    setBuilderOpen(true);
  }
  function openEdit(p: Plan) {
    setEditing(p);
    setBuilderOpen(true);
  }
  const isRTL = lang === "ar";

  return (
    <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{S.title[lang]}</span>
          <h1>{S.title[lang]}</h1>
          <p>{S.subtitle[lang]}</p>
        </div>
        <button className="pb-btn-primary" onClick={openNew}>
          {S.new_plan[lang]}
        </button>
      </header>

      {loading ? (
        <div className="pb-skeleton-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pb-skeleton-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="pb-empty">
          <p>{S.empty[lang]}</p>
          <button className="pb-btn-primary" onClick={openNew}>
            {S.new_plan[lang]}
          </button>
        </div>
      ) : (
        <>
          <div className="pb-card-grid">
            {active.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onClick={() => openEdit(p)}
                drinkCount={p.allowed_drink_ids.length || drinks.length}
                branchCount={p.allowed_branch_ids.length || Math.max(0, branches.length - p.excluded_branch_ids.length)}
              />
            ))}
          </div>
          {archived.length > 0 && (
            <>
              <h2 className="pb-section-label" style={{ marginTop: "2rem" }}>
                {S.archive[lang]}
              </h2>
              <div className="pb-card-grid">
                {archived.map((p) => (
                  <PlanCard key={p.id} plan={p} onClick={() => openEdit(p)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {builderOpen && organization && (
        <PlanBuilder
          organizationId={organization.id}
          editing={editing}
          duplicating={null}
          drinks={drinks}
          branches={branches}
          defaultCurrency="SAR"
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            setBuilderOpen(false);
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
