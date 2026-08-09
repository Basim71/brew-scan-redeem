import { useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Paperclip, Search, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Field, Input } from "./Field";
import { IconButton } from "./Button";

type FieldMeta = { label?: ReactNode; hint?: ReactNode; error?: ReactNode };
type NativeInput = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type">;

/** Search field with icon + clear affordance. */
export function SearchInput({
  value,
  onValueChange,
  placeholder,
  label,
  className = "",
  ...rest
}: NativeInput & FieldMeta & { value: string; onValueChange: (next: string) => void }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className={`kob-search ${className}`}>
      <Search size={16} aria-hidden className="kob-search-icon" />
      <input
        id={id}
        type="search"
        className="kob-input kob-search-input"
        value={value}
        aria-label={typeof label === "string" ? label : t("common.actions.search")}
        placeholder={placeholder ?? t("common.actions.search")}
        onChange={(e) => onValueChange(e.target.value)}
        {...rest}
      />
      {value ? (
        <IconButton size="sm" label={t("common.actions.clear")} onClick={() => onValueChange("")}>
          <X size={14} />
        </IconButton>
      ) : null}
    </div>
  );
}

/** Password field with a show/hide toggle. */
export function PasswordInput({ label, hint, error, required, className = "", ...rest }: NativeInput & FieldMeta & { required?: boolean }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <div className="kob-input-affix">
          <input
            id={id}
            type={visible ? "text" : "password"}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={`kob-input ${className}`}
            required={required}
            {...rest}
          />
          <IconButton
            size="sm"
            label={visible ? t("common.actions.hide") : t("common.actions.show")}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </IconButton>
        </div>
      )}
    </Field>
  );
}

/** Saudi phone input — keeps the technical value LTR in both languages. */
export function PhoneInput({
  label,
  hint,
  error,
  required,
  value,
  onValueChange,
  ...rest
}: NativeInput & FieldMeta & { required?: boolean; value: string; onValueChange: (next: string) => void }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          placeholder="05XXXXXXXX"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="kob-input kob-input-numeric"
          value={value}
          required={required}
          onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          {...rest}
        />
      )}
    </Field>
  );
}

export function NumberInput(props: NativeInput & FieldMeta & { required?: boolean }) {
  return <Input type="number" inputMode="decimal" className="kob-input-numeric" {...props} />;
}

export function DateInput(props: NativeInput & FieldMeta & { required?: boolean }) {
  return <Input type="date" className="kob-input-numeric" {...props} />;
}

/** Date range built from two global date inputs. */
export function DateRangeInput({
  fromLabel,
  toLabel,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  fromLabel: string;
  toLabel: string;
  from: string;
  to: string;
  onFromChange: (next: string) => void;
  onToChange: (next: string) => void;
}) {
  return (
    <div className="kob-range">
      <DateInput label={fromLabel} value={from} onChange={(e) => onFromChange(e.target.value)} />
      <DateInput label={toLabel} value={to} min={from || undefined} onChange={(e) => onToChange(e.target.value)} />
    </div>
  );
}

/** Chip based multi select — no external dependency, RTL safe. */
export function MultiSelect<T extends string>({
  label,
  hint,
  error,
  options,
  selected,
  onToggle,
  disabled,
}: FieldMeta & {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ describedBy }) => (
        <div className="kob-multiselect" role="group" aria-describedby={describedBy}>
          {options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className="kob-chip"
                data-active={active || undefined}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onToggle(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}

/** File upload well (click or drop). */
export function FileUpload({
  label,
  hint,
  error,
  accept,
  multiple,
  onFiles,
  busy,
  children,
}: FieldMeta & {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  busy?: boolean;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = "";
  };
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <div className="kob-upload" data-busy={busy || undefined}>
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="kob-sr-only"
            aria-describedby={describedBy}
            onChange={handle}
          />
          <button
            type="button"
            className="kob-upload-target"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files ?? []);
              if (files.length) onFiles(files);
            }}
          >
            <Paperclip size={18} aria-hidden />
            <span>{children ?? t("common.actions.upload")}</span>
          </button>
        </div>
      )}
    </Field>
  );
}

/** OTP / code input — fixed length, numeric, always LTR. */
export function OtpInput({
  length = 6,
  value,
  onValueChange,
  label,
  error,
}: FieldMeta & { length?: number; value: string; onValueChange: (next: string) => void }) {
  return (
    <Field label={label} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          dir="ltr"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="kob-input kob-otp"
          value={value}
          onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        />
      )}
    </Field>
  );
}
