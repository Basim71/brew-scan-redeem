import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "gold" | "espresso";

/** Global KOB badge. Never style badges ad-hoc — pass a tone. */
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="kob-badge" data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}

/** Numeric counter (notifications, unread, queue length). */
export function CountBadge({
  value,
  max = 99,
  tone = "gold",
  label,
}: {
  value: number;
  max?: number;
  tone?: BadgeTone;
  label?: string;
}) {
  if (!value) return null;
  const shown = value > max ? `${max}+` : String(value);
  return (
    <span className="kob-count-badge" data-tone={tone} aria-label={label}>
      {shown}
    </span>
  );
}

/** Read/unread dot for notification rows. */
export function StatusDot({ tone = "gold", label }: { tone?: BadgeTone; label?: string }) {
  return <span className="kob-status-dot" data-tone={tone} role={label ? "img" : undefined} aria-label={label} />;
}
