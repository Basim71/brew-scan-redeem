import { useEffect, useRef, useState } from "react";

import { Input, Textarea } from "@/components/kob";
import { useI18n } from "@/lib/i18n";

/**
 * Resolves a settings error code to a user-facing message.
 * Pass `t` (from useI18n) to use the localized copy; without it, falls back
 * to the legacy bilingual map for callers that have not migrated yet.
 */
export function translateError(code: string | undefined, isAr: boolean, t?: (key: string, vars?: Record<string, any>) => string): string {
  if (t) {
    const keyMap: Record<string, string> = {
      settings_invalid_currency: "settings.shell.errors.settingsInvalidCurrency",
      settings_invalid_tax: "settings.shell.errors.settingsInvalidTax",
      settings_no_payment_method: "settings.shell.errors.settingsNoPaymentMethod",
      settings_default_payment_not_enabled: "settings.shell.errors.settingsDefaultPaymentNotEnabled",
      settings_invalid_bonus_days: "settings.shell.errors.settingsInvalidBonusDays",
      settings_invalid_prep_time: "settings.shell.errors.settingsInvalidPrepTime",
      settings_invalid_session_timeout: "settings.shell.errors.settingsInvalidSessionTimeout",
      cannot_demote_last_owner: "settings.shell.errors.cannotDemoteLastOwner",
    };
    if (code && keyMap[code]) return t(keyMap[code]!);
    return code || t("settings.shell.errors.couldNotSave");
  }

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
  const { t } = useI18n();
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

  const hint = !error && local !== value ? t("settings.fields.savesAutomatically") : undefined;

  const shared = {
    value: local,
    disabled,
    placeholder,
    error,
    hint,
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

  return multiline ? <Textarea rows={2} {...shared} /> : <Input type={type} {...shared} />;
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
  const { t } = useI18n();
  return (
    <TextInput
      isAr={isAr}
      type="number"
      disabled={disabled}
      value={String(value)}
      validate={(raw) => {
        const n = Number(raw);
        if (raw.trim() === "" || Number.isNaN(n)) return t("settings.fields.invalidNumber");
        if (n < min || n > max) return t("settings.fields.valueBetween", { min, max });
        return null;
      }}
      onCommit={(raw) => onCommit(Number(raw))}
    />
  );
}
