import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="pb-field">
      <div className="pb-field-label">{label}</div>
      {children}
      {hint && <div className="pb-field-hint">{hint}</div>}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`pb-toggle ${checked ? "pb-toggle-on" : ""}`}
      aria-pressed={checked}
    >
      <div>
        <div className="pb-toggle-label">{label}</div>
        {hint && <div className="pb-toggle-hint">{hint}</div>}
      </div>
      <span className="pb-toggle-track">
        <span className="pb-toggle-thumb" />
      </span>
    </button>
  );
}

export function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="pb-chip-row">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`pb-chip ${value === o.value ? "pb-chip-active" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberQuick({
  value,
  onChange,
  options,
  allowUnlimited,
  unlimitedLabel,
  min = 0,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: number[];
  allowUnlimited?: boolean;
  unlimitedLabel?: string;
  min?: number;
}) {
  const isUnlimited = allowUnlimited && (value === null || value === undefined);
  return (
    <div className="pb-chip-row">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`pb-chip ${!isUnlimited && value === n ? "pb-chip-active" : ""}`}
        >
          {n}
        </button>
      ))}
      {allowUnlimited && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`pb-chip ${isUnlimited ? "pb-chip-active" : ""}`}
        >
          {unlimitedLabel ?? "∞"}
        </button>
      )}
      <input
        type="number"
        min={min}
        className="pb-input pb-input-tight"
        placeholder="—"
        value={isUnlimited ? "" : (value ?? "")}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange(allowUnlimited ? null : min);
          else onChange(Number(raw));
        }}
      />
    </div>
  );
}