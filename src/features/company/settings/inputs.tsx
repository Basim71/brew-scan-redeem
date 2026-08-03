import { useEffect, useRef, useState } from "react";

export function translateError(code: string | undefined, isAr: boolean): string {
  const map: Record<string, [string, string]> = {
    settings_invalid_currency: ["العملة غير صحيحة", "Invalid currency code"],
    settings_invalid_tax: ["نسبة الضريبة غير صحيحة", "Tax percentage must be 0–100"],
    settings_no_payment_method: ["يجب تفعيل وسيلة دفع واحدة على الأقل", "At least one payment method is required"],
    settings_default_payment_not_enabled: [
      "وسيلة الدفع الافتراضية غير مفعّلة",
      "Default payment method must be enabled",
    ],
    settings_invalid_bonus_days: ["أيام المكافأة غير صحيحة", "Bonus days must be 0–365"],
    settings_invalid_prep_time: ["مدة التحضير غير صحيحة", "Preparation time must be 0–240 minutes"],
    settings_invalid_session_timeout: ["مدة الجلسة غير صحيحة", "Session timeout must be 15–10080 minutes"],
    cannot_demote_last_owner: ["لا يمكن تنزيل آخر مالك", "Cannot demote the last owner"],
  };
  if (code && map[code]) return isAr ? map[code]![0] : map[code]![1];
  return code || (isAr ? "تعذر الحفظ" : "Could not save");
}

export function TextInput({
  value,
  onCommit,
  validate,
  disabled,
  type = "text",
  placeholder,
  isAr,
  multiline,
}: {
  value: string;
  onCommit: (value: string) => void;
  validate?: (value: string) => string | null;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  isAr: boolean;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => setLocal(value), [value]);

  const push = (next: string) => {
    const message = validate ? validate(next) : null;
    setError(message);
    if (message) return;
    if (next === value) return;
    onCommit(next);
  };

  const shared = {
    className: "cs-input",
    value: local,
    disabled,
    placeholder,
    onChange: (e: any) => {
      const next = e.target.value as string;
      setLocal(next);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => push(next), 800);
    },
    onBlur: () => {
      if (timer.current) window.clearTimeout(timer.current);
      push(local);
    },
  };

  return (
    <>
      {multiline ? <textarea rows={2} {...shared} /> : <input type={type} {...shared} />}
      {error ? <span className="cs-error">{error}</span> : null}
      {!error && local !== value ? (
        <span className="cs-hint">{isAr ? "سيتم الحفظ تلقائيًا…" : "Saves automatically…"}</span>
      ) : null}
    </>
  );
}

export function NumberInput({
  value,
  onCommit,
  min,
  max,
  disabled,
  isAr,
}: {
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  isAr: boolean;
}) {
  return (
    <TextInput
      isAr={isAr}
      type="number"
      disabled={disabled}
      value={String(value)}
      validate={(raw) => {
        const n = Number(raw);
        if (raw.trim() === "" || Number.isNaN(n)) return isAr ? "قيمة غير صحيحة" : "Invalid number";
        if (n < min || n > max) return isAr ? `القيمة بين ${min} و ${max}` : `Value must be ${min}–${max}`;
        return null;
      }}
      onCommit={(raw) => onCommit(Number(raw))}
    />
  );
}