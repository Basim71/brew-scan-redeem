import type { ReactNode } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { Badge, Button, Card as KobCard, CardBody, CardHeader, Toggle as KobToggle } from "@/components/kob";
import { useI18n } from "@/lib/i18n";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ state, lang, message }: { state: SaveState; lang: "ar" | "en"; message?: string | null }) {
  const { t } = useI18n();
  if (state === "idle") return null;
  if (state === "saving")
    return (
      <Badge tone="info" icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}>
        {t("settings.shell.saving")}
      </Badge>
    );
  if (state === "saved")
    return (
      <Badge tone="success" icon={<Check className="h-3.5 w-3.5" />}>
        {t("settings.shell.saved")}
      </Badge>
    );
  return (
    <Badge tone="error" icon={<TriangleAlert className="h-3.5 w-3.5" />}>
      {message || t("settings.shell.saveFailed")}
    </Badge>
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
    <KobCard>
      <CardHeader title={title} description={description} action={aside} />
      <CardBody>{children}</CardBody>
    </KobCard>
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
    <div
      className="grid min-w-0 grid-cols-1 gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-start sm:gap-4"
      data-invalid={error ? "true" : undefined}
    >
      <div className="min-w-0">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {hint ? <small className="mt-0.5 block text-xs text-muted-foreground">{hint}</small> : null}
      </div>
      <div className="min-w-0 space-y-1">
        {children}
        {error ? (
          <span className="block text-xs text-destructive" role="alert">
            {error}
          </span>
        ) : null}
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
    <KobToggle
      label={<span className="kob-sr-only">{label}</span>}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
    />
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
    <div className="flex flex-wrap gap-1.5" role="group">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === value ? "primary" : "secondary"}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
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
      className="kob-chip"
      data-active={checked || undefined}
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      {checked ? <Check className="h-3 w-3" /> : null}
      {label}
    </button>
  );
}
