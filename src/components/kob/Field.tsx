import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

type BaseFieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
};

export function Field({ label, hint, error, required, children }: BaseFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="kob-field" data-invalid={error ? true : undefined}>
      {label ? (
        <label htmlFor={id}>
          {label}
          {required ? <span className="kob-required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? <small id={hintId}>{hint}</small> : null}
      {error ? <small id={errorId} className="kob-field-error" role="alert">{error}</small> : null}
    </div>
  );
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Input({ label, hint, error, className = "", required, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`kob-input ${className}`}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
}

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Textarea({ label, hint, error, className = "", required, ...rest }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`kob-input kob-textarea ${className}`}
          required={required}
          {...rest}
        />
      )}
    </Field>
  );
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

export function Select({ label, hint, error, className = "", required, children, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`kob-input kob-select ${className}`}
          required={required}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
}
