import type { ReactNode } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ state, lang, message }: { state: SaveState; lang: "ar" | "en"; message?: string | null }) {
  const isAr = lang === "ar";
  if (state === "idle") return null;
  if (state === "saving")
    return (
      <span className="cs-save cs-save-busy">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {isAr ? "جارٍ الحفظ…" : "Saving…"}
      </span>
    );
  if (state === "saved")
    return (
      <span className="cs-save cs-save-ok">
        <Check className="h-3.5 w-3.5" />
        {isAr ? "تم الحفظ" : "Saved"}
      </span>
    );
  return (
    <span className="cs-save cs-save-err">
      <TriangleAlert className="h-3.5 w-3.5" />
      {message || (isAr ? "فشل الحفظ" : "Save failed")}
    </span>
  );
}

export function Card({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="cs-card">
      <header className="cs-card-head">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {aside}
      </header>
      <div className="cs-card-body">{children}</div>
    </section>
  );
}

export function Row({
  label,
  hint,
  children,
  error,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  error?: string | null;
}) {
  return (
    <div className={`cs-row${error ? " cs-row-error" : ""}`}>
      <div className="cs-row-label">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="cs-row-control">
        {children}
        {error ? <span className="cs-error">{error}</span> : null}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="cs-toggle"
      data-on={checked ? "true" : "false"}
      onClick={() => onChange(!checked)}
    >
      <span className="cs-toggle-knob" />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="cs-segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          data-active={option.value === value ? "true" : "false"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CheckChip({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="cs-chip"
      data-on={checked ? "true" : "false"}
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="cs-chip-box">{checked ? <Check className="h-3 w-3" /> : null}</span>
      {label}
    </button>
  );
}
