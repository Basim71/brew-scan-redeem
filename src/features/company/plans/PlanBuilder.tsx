import { useCallback, useEffect, useMemo, useState } from "react";
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
import CustomizationStep from "./steps/CustomizationStep";
import ReviewStep from "./steps/ReviewStep";

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
      const raw =
        typeof window !== "undefined" ? window.sessionStorage.getItem(DRAFT_KEY) : null;
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

  const update = useCallback(
    (patch: Partial<PlanInput>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );

  const issues = useMemo(() => validatePlan(draft), [draft]);
  const stepIssues = (n: number) => issues.filter((i) => i.step === n);

  const steps = [
    S.step_basic[lang],
    S.step_pricing[lang],
    S.step_consumption[lang],
    S.step_drinks[lang],
    S.step_branches[lang],
    S.step_custom[lang],
    S.step_review[lang],
  ];

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
      else if (msg.includes("plan_max_daily_below_redemption"))
        toast.error(S.err_max_daily_below[lang]);
      else if (msg.includes("plan_custom_frequency_days_required"))
        toast.error(S.err_freq_custom[lang]);
      else if (msg.includes("plan_carry_days_required")) toast.error(S.err_carry_days[lang]);
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
        return <CustomizationStep lang={lang} value={draft} onChange={update} />;
      case 6:
        return <ReviewStep lang={lang} value={draft} drinks={drinks} branches={branches} />;
      default:
        return null;
    }
  })();

  return (
    <div className="pb-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="pb-dialog pb-dialog-wide"
        onClick={(e) => e.stopPropagation()}
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <header className="pb-dialog-head">
          <div>
            <h2 className="pb-dialog-title">
              {editing ? S.edit_plan[lang] : S.new_plan[lang]}
            </h2>
            <div className="pb-dim">
              {S.step_of[lang]
                .replace("{a}", String(step + 1))
                .replace("{b}", "7")}{" "}
              · {steps[step]}
            </div>
          </div>
          <button type="button" className="pb-btn-ghost" onClick={onClose} disabled={busy}>
            ✕
          </button>
        </header>

        <nav className="pb-stepper">
          {steps.map((label, i) => (
            <button
              key={i}
              type="button"
              className={`pb-stepper-item ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              onClick={() => setStep(i)}
            >
              <span className="pb-stepper-num">{i + 1}</span>
              <span className="pb-stepper-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="pb-dialog-body">{stepEl}</div>

        <footer className="pb-dialog-footer">
          <button
            type="button"
            className="pb-btn-ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            {S.back[lang]}
          </button>
          {step < 6 ? (
            <button
              type="button"
              className="pb-btn-primary"
              onClick={() => {
                if (!canAdvance()) {
                  toast.error(S[stepIssues(step)[0].key as keyof typeof S][lang]);
                  return;
                }
                setStep((s) => Math.min(6, s + 1));
              }}
              disabled={busy}
            >
              {S.next[lang]}
            </button>
          ) : (
            <button
              type="button"
              className="pb-btn-primary"
              onClick={save}
              disabled={busy || issues.length > 0}
            >
              {S.save_plan[lang]}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}