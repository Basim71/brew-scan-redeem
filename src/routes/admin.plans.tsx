import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import {
  listPlans,
  setPlanActive,
  archivePlan,
  unarchivePlan,
  deletePlan,
  type Plan,
} from "@/services/company/plans.service";
import { listDrinks, type DrinkTypeRow } from "@/services/company/drinks.service";
import { listBranches, type BranchRow } from "@/services/company/branches.service";
import { PlanBuilder } from "@/features/company/plans/PlanBuilder";
import { PlanCard } from "@/features/company/plans/PlanCard";
import { PlanPreviewDialog } from "@/features/company/plans/PlanPreviewDialog";
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
  const [duplicating, setDuplicating] = useState<Plan | null>(null);
  const [previewing, setPreviewing] = useState<Plan | null>(null);
  const [confirm, setConfirm] = useState<{ plan: Plan; action: "delete" | "archive" } | null>(
    null,
  );

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
    setDuplicating(null);
    setBuilderOpen(true);
  }
  function openEdit(p: Plan) {
    setEditing(p);
    setDuplicating(null);
    setBuilderOpen(true);
  }
  function openDuplicate(p: Plan) {
    setEditing(null);
    setDuplicating(p);
    setBuilderOpen(true);
  }

  async function doToggle(p: Plan) {
    try {
      await setPlanActive(p.id, !p.is_active);
      toast.success(S.saved[lang]);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function doConfirmed() {
    if (!confirm) return;
    try {
      if (confirm.action === "delete") {
        await deletePlan(confirm.plan.id);
        toast.success(S.deleted_ok[lang]);
      } else {
        await archivePlan(confirm.plan.id);
        toast.success(S.archived_ok[lang]);
      }
      setConfirm(null);
      void load();
    } catch (e) {
      setConfirm(null);
      const msg = (e as Error).message ?? "";
      if (msg.includes("plan_has_subscriptions")) toast.error(S.err_delete_subscriptions[lang]);
      else if (msg.includes("plan_has_coupons")) toast.error(S.err_delete_coupons[lang]);
      else toast.error(msg);
    }
  }

  async function doUnarchive(p: Plan) {
    try {
      await unarchivePlan(p.id);
      toast.success(S.restored_ok[lang]);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
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
          + {S.new_plan[lang]}
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
            + {S.new_plan[lang]}
          </button>
        </div>
      ) : (
        <>
          <div className="pb-card-grid">
            {active.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onEdit={() => openEdit(p)}
                onDuplicate={() => openDuplicate(p)}
                onArchive={() => setConfirm({ plan: p, action: "archive" })}
                onDelete={() => setConfirm({ plan: p, action: "delete" })}
                onPreview={() => setPreviewing(p)}
                onToggleActive={() => void doToggle(p)}
                drinkCount={p.allowed_drink_ids.length || drinks.length}
                branchCount={
                  p.allowed_branch_ids.length ||
                  Math.max(0, branches.length - p.excluded_branch_ids.length)
                }
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
                  <PlanCard
                    key={p.id}
                    plan={p}
                    onEdit={() => openEdit(p)}
                    onDuplicate={() => openDuplicate(p)}
                    onUnarchive={() => void doUnarchive(p)}
                    onDelete={() => setConfirm({ plan: p, action: "delete" })}
                    onPreview={() => setPreviewing(p)}
                    onToggleActive={() => void doToggle(p)}
                  />
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
          duplicating={duplicating}
          drinks={drinks}
          branches={branches}
          defaultCurrency="SAR"
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            setBuilderOpen(false);
            setEditing(null);
            setDuplicating(null);
            void load();
          }}
        />
      )}

      {previewing && (
        <PlanPreviewDialog
          plan={previewing}
          drinks={drinks}
          branches={branches}
          onClose={() => setPreviewing(null)}
        />
      )}

      {confirm && (
        <div className="pb-overlay" onClick={() => setConfirm(null)}>
          <div className="pb-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="pb-dialog-title">
              {confirm.action === "delete" ? S.confirm_delete[lang] : S.confirm_archive[lang]}
            </h3>
            <p className="pb-dim">
              {(lang === "ar" ? confirm.plan.name_ar : confirm.plan.name_en) || confirm.plan.name}
            </p>
            <div className="pb-dialog-footer">
              <button className="pb-btn-ghost" onClick={() => setConfirm(null)}>
                {S.cancel[lang]}
              </button>
              <button className="pb-btn-danger" onClick={doConfirmed}>
                {confirm.action === "delete" ? S.del[lang] : S.archive[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}