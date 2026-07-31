import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { Plan, PlanInput } from "@/services/company/plans.service";
import { createPlan, updatePlan } from "@/services/company/plans.service";
import type { DrinkTypeRow } from "@/services/company/drinks.service";
import type { BranchRow } from "@/services/company/branches.service";
import { emptyDraft } from "./types";
import { S } from "./strings";
import { validatePlan } from "./validation";
import BasicsStep from "./steps/BasicsStep";
import PricingStep from "./steps/PricingStep";
import ConsumptionStep from "./steps/ConsumptionStep";
import DrinksStep from "./steps/DrinksStep";
import BranchesStep from "./steps/BranchesStep";
import ReviewStep from "./steps/ReviewStep";
import { PlanCard } from "./PlanCard";

const DRAFT_KEY = "kob.planBuilder.draft";

function planToInput(p: Plan): PlanInput {
  const { id: _id, name: _n, created_at: _c, ...rest } = p;
  return rest;
}

export function PlanBuilder({
  organizationId,
  editing,
  duplicating,
  drinks,
  branches,
  defaultCurrency,
  onClose,
  onSaved,
}: {
  organizationId: string;
  editing: Plan | null;
  duplicating: Plan | null;
  drinks: DrinkTypeRow[];
  branches: BranchRow[];
  defaultCurrency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PlanInput>(() => {
    if (editing) return planToInput(editing);
    if (duplicating) {
      const dup = planToInput(duplicating);
      return {
        ...dup,
        name_ar: `${dup.name_ar} (${lang === "ar" ? "نسخة" : "copy"})`,
        name_en: `${dup.name_en} (copy)`,
      };
    }
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(DRAFT_KEY) : null;
      if (raw) return { ...emptyDraft(defaultCurrency), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return emptyDraft(defaultCurrency);
  });

  useEffect(() => {
    if (editing || duplicating) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, editing, duplicating]);

  const update = useCallback((patch: Partial<PlanInput>) => setDraft((d) => ({ ...d, ...patch })), []);

  const issues = useMemo(() => validatePlan(draft), [draft]);
  const stepIssues = (n: number) => issues.filter((i) => i.step === n);

  const steps = [
    S.step_basic[lang],
    S.step_pricing[lang],
    S.step_consumption[lang],
    S.step_drinks[lang],
    S.step_branches[lang],
    S.step_review[lang],
  ];
  const last = steps.length - 1;

  function canAdvance() {
    return stepIssues(step).length === 0;
  }

  async function save() {
    if (issues.length > 0) {
      toast.error(S[issues[0].key as keyof typeof S][lang]);
      setStep(issues[0].step);
      return;
    }
    setBusy(true);
    try {
      if (editing) await updatePlan(editing.id, draft, organizationId);
      else await createPlan(draft, organizationId);
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      toast.success(S.saved[lang]);
      onSaved();
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("plans_org_name")) toast.error(S.err_duplicate_name[lang]);
      else if (msg.includes("plan_max_daily_below_redemption")) toast.error(S.err_max_daily_below[lang]);
      else if (msg.includes("plan_invalid_time_window")) toast.error(S.err_time_window[lang]);
      else if (msg.includes("plan_invalid_duration")) toast.error(S.err_duration[lang]);
      else if (msg.includes("plan_invalid_price")) toast.error(S.err_price[lang]);
      else toast.error(`${S.err_saving[lang]} ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  const stepEl = (() => {
    switch (step) {
      case 0:
        return <BasicsStep lang={lang} value={draft} onChange={update} />;
      case 1:
        return <PricingStep lang={lang} value={draft} onChange={update} />;
      case 2:
        return <ConsumptionStep lang={lang} value={draft} onChange={update} />;
      case 3:
        return <DrinksStep lang={lang} value={draft} onChange={update} drinks={drinks} />;
      case 4:
        return <BranchesStep lang={lang} value={draft} onChange={update} branches={branches} />;
      case 5:
        return <ReviewStep lang={lang} value={draft} drinks={drinks} branches={branches} />;
      default:
        return null;
    }
  })();

  const previewPlan: Plan = {
    ...draft,
    id: "preview",
    name: draft.name_en || draft.name_ar,
    created_at: new Date().toISOString(),
  };

  return (
    <div
      className="ds-modal-overlay pb-below-island"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        dir={lang === "ar" ? "rtl" : "ltr"}
        aria-label={editing ? S.edit_plan[lang] : S.new_plan[lang]}
      >
        <header className="ds-modal-header">
          <div>
            <h2>{editing ? S.edit_plan[lang] : S.new_plan[lang]}</h2>
            <p>{S.subtitle[lang]}</p>
          </div>
          <div className="ds-modal-header-side">
            <button
              type="button"
              className="ds-icon-button"
              onClick={onClose}
              disabled={busy}
              aria-label={lang === "ar" ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <ol className="ds-progress">
          {steps.map((label, i) => (
            <li key={label} data-state={i === step ? "current" : i < step ? "done" : "todo"}>
              <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
                <span>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="ds-modal-body">
          <div className="ds-modal-main" data-step={step}>
            <div className="ds-step-shell">
              <div className="ds-step-heading">
                <h3>{steps[step]}</h3>
                <p>{S.step_of[lang].replace("{a}", String(step + 1)).replace("{b}", String(steps.length))}</p>
              </div>
              {stepEl}
            </div>
          </div>
          <aside className="ds-modal-side">
            <span className="ds-side-title">{S.preview[lang]}</span>
            <PlanCard plan={previewPlan} lang={lang} preview />
          </aside>
        </div>

        <footer className="ds-modal-footer">
          <button
            type="button"
            className="ds-nav-button ds-nav-button--back"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
            aria-label={S.back[lang]}
            title={S.back[lang]}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="ds-footer-actions">
            {step < last ? (
              <button
                type="button"
                className="ds-nav-button ds-nav-button--next"
                onClick={() => {
                  if (!canAdvance()) {
                    toast.error(S[stepIssues(step)[0].key as keyof typeof S][lang]);
                    return;
                  }
                  setStep((s) => Math.min(last, s + 1));
                }}
                disabled={busy}
                aria-label={S.next[lang]}
                title={S.next[lang]}
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                className="btn-brass px-6 py-2.5"
                onClick={save}
                disabled={busy || issues.length > 0}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing ? S.save_changes[lang] : S.create_plan[lang]}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
