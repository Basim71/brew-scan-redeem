import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Button, IconButton, Modal } from "@/components/kob";
import { useI18n } from "@/lib/i18n";
import { emptyDraft } from "../constants";
import { saveDrinkDraft, uploadDrinkImage } from "../service";
import type { DrinkDraft } from "../types";
import { AllergensStep, IdentityStep, NutritionStep, OptionsStep, VisualStep } from "./steps";
import { LivePreview } from "./LivePreview";

const STEPS = ["identity", "visual", "nutrition", "allergens", "options"] as const;
const DRAFT_STORAGE_PREFIX = "kob:drink-draft:";

type Props = {
  initialDraft?: DrinkDraft;
  lastUpdated?: string | null;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
};

function relativeTime(iso: string | null | undefined, t: (k: string, v?: Record<string, number>) => string): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return t("drinks.daysAgo", { n: days });
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return t("drinks.hoursAgo", { n: hours });
  return t("drinks.justNow");
}

export function DrinkWizard({ initialDraft, lastUpdated, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<DrinkDraft>(() => initialDraft ?? emptyDraft());
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storageKey = useMemo(() => `${DRAFT_STORAGE_PREFIX}${draft.id ?? "new"}`, [draft.id]);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (initialDraft) return;
    const stored = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}new`);
    if (!stored) return;
    try {
      setDraft(JSON.parse(stored) as DrinkDraft);
    } catch {
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}new`);
    }
  }, [initialDraft]);

  const persistDraft = useCallback(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(draftRef.current));
  }, [storageKey]);

  const patch = useCallback((value: Partial<DrinkDraft>) => setDraft((current) => ({ ...current, ...value })), []);

  function goTo(next: number) {
    persistDraft();
    setStep(Math.min(STEPS.length - 1, Math.max(0, next)));
  }

  async function pickFile(file: File) {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError(t("drinks.err.image"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { path, url } = await uploadDrinkImage(file);
      patch({ image_url: url, image_path: path });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("drinks.err.upload"));
    } finally {
      setUploading(false);
    }
  }

  async function save(publish: boolean) {
    if (!draft.name_en.trim() || !draft.name_ar.trim()) {
      setError(t("drinks.err.names"));
      setStep(0);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDrinkDraft(draft, publish);
      window.localStorage.removeItem(storageKey);
      await onSaved(publish ? t("drinks.published") : t("drinks.draftSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("drinks.err.save"));
    } finally {
      setBusy(false);
    }
  }

  const editingLabel = draft.id ? t("drinks.editing", { name: draft.name_en || draft.name_ar || t("drinks.drink") }) : t("drinks.newDrink");
  const updatedLabel = relativeTime(lastUpdated, t);

  return (
    <Modal
      open
      onClose={onClose}
      title={editingLabel}
      description={updatedLabel ? t("drinks.lastUpdated", { time: updatedLabel }) : t("drinks.buildHint")}
      size="lg"
      footer={
        <>
          <IconButton
            label={t("drinks.prevStep")}
            variant="ghost"
            disabled={step === 0}
            onClick={() => goTo(step - 1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <div className="ds-footer-actions">
            <Button variant="ghost" disabled={busy} onClick={() => void save(false)}>
              {t("drinks.saveDraft")}
            </Button>
            {step < STEPS.length - 1 ? (
              <IconButton label={t("drinks.nextStep")} variant="secondary" onClick={() => goTo(step + 1)}>
                <ArrowRight className="h-5 w-5" />
              </IconButton>
            ) : (
              <Button variant="gold" loading={busy} leadingIcon={<Check className="h-4 w-4" />} onClick={() => void save(true)}>
                {t("drinks.publish")}
              </Button>
            )}
          </div>
        </>
      }
    >
      <ol className="ds-progress">
        {STEPS.map((label, index) => (
          <li key={label} data-state={index === step ? "current" : index < step ? "done" : "todo"}>
            <button type="button" onClick={() => goTo(index)} aria-current={index === step ? "step" : undefined}>
              <span>{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>
              {t(`drinks.step.${label}`)}
            </button>
          </li>
        ))}
      </ol>

      <div className="ds-modal-body">
        <div className="ds-modal-main" data-step={step}>
          <div className="ds-step-shell">
            <div className="ds-step-heading">
              <h3>{t(`drinks.meta.${STEPS[step]}.title`)}</h3>
              <p>{t(`drinks.meta.${STEPS[step]}.desc`)}</p>
            </div>
            {error && <div className="ds-error">{error}</div>}
            {step === 0 && <IdentityStep draft={draft} patch={patch} />}
            {step === 1 && <VisualStep draft={draft} patch={patch} onPickFile={pickFile} uploading={uploading} />}
            {step === 2 && <NutritionStep draft={draft} patch={patch} />}
            {step === 3 && <AllergensStep draft={draft} patch={patch} />}
            {step === 4 && <OptionsStep draft={draft} patch={patch} />}
          </div>
        </div>
        <aside className="ds-modal-side">
          <span className="ds-side-title">{t("drinks.livePreview")}</span>
          <LivePreview draft={draft} />
        </aside>
      </div>
    </Modal>
  );
}
