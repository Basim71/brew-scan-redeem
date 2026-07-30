import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";

import { emptyDraft } from "../constants";
import { saveDrinkDraft, uploadDrinkImage } from "../service";
import type { DrinkDraft } from "../types";
import { AllergensStep, IdentityStep, NutritionStep, OptionsStep, VisualStep } from "./steps";
import { LivePreview } from "./LivePreview";

const STEPS = ["Identity", "Visual", "Nutrition", "Allergens", "Options"] as const;
const STEP_META = [
  { title: "Drink identity", description: "Add the names, category and availability status." },
  { title: "Drink visual", description: "Upload and position the image customers will see." },
  { title: "Nutrition", description: "Set calories, serving information and drink characteristics." },
  { title: "Allergens", description: "Select every allergen that applies to this drink." },
  { title: "Drink options", description: "Configure milk, sugar, shots, syrups and other choices." },
] as const;
const DRAFT_STORAGE_PREFIX = "kob:drink-draft:";

type Props = {
  initialDraft?: DrinkDraft;
  lastUpdated?: string | null;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
};

function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "just now";
}

export function DrinkWizard({ initialDraft, lastUpdated, onClose, onSaved }: Props) {
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
      setError("Use an image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { path, url } = await uploadDrinkImage(file);
      patch({ image_url: url, image_path: path });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(publish: boolean) {
    if (!draft.name_en.trim() || !draft.name_ar.trim()) {
      setError("Arabic and English names are required.");
      setStep(0);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDrinkDraft(draft, publish);
      window.localStorage.removeItem(storageKey);
      await onSaved(publish ? "Drink published." : "Draft saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save drink.");
    } finally {
      setBusy(false);
    }
  }

  const editingLabel = draft.id ? `Editing ${draft.name_en || "drink"}` : "New drink";
  const updatedLabel = relativeTime(lastUpdated);

  return (
    <div className="ds-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="ds-modal" role="dialog" aria-modal="true" aria-label={editingLabel}>
        <header className="ds-modal-header">
          <div>
            <h2>{editingLabel}</h2>
            <p>{updatedLabel ? `Last updated ${updatedLabel}` : "Build the drink customers will see."}</p>
          </div>
          <div className="ds-modal-header-side">
            <button type="button" className="ds-icon-button" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <ol className="ds-progress">
          {STEPS.map((label, index) => (
            <li key={label} data-state={index === step ? "current" : index < step ? "done" : "todo"}>
              <button type="button" onClick={() => goTo(index)} aria-current={index === step ? "step" : undefined}>
                <span>{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="ds-modal-body">
          <div className="ds-modal-main" data-step={step}>
            <div className="ds-step-shell">
              <div className="ds-step-heading">
                <h3>{STEP_META[step].title}</h3>
                <p>{STEP_META[step].description}</p>
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
            <span className="ds-side-title">Live preview</span>
            <LivePreview draft={draft} />
          </aside>
        </div>

        <footer className="ds-modal-footer">
          <button
            type="button"
            className="ds-nav-button ds-nav-button--back"
            disabled={step === 0}
            onClick={() => goTo(step - 1)}
            aria-label="Previous step"
            title="Previous step"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="ds-footer-actions">
            <button
              type="button"
              className="btn-ghost-brass px-5 py-2.5"
              disabled={busy}
              onClick={() => void save(false)}
            >
              Save Draft
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="ds-nav-button ds-nav-button--next"
                onClick={() => goTo(step + 1)}
                aria-label="Next step"
                title="Next step"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" className="btn-brass px-6 py-2.5" disabled={busy} onClick={() => void save(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Publish Drink
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
