import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export type StatusBadgeProps = {
  tone?: StatusTone;
  children: ReactNode;
  icon?: ReactNode;
};

/**
 * Unified KOB status badge — used across Platform, Company, Cashier,
 * Customer Success. Consumes design tokens from src/styles.css
 * (`--kob-success`, `--kob-warning`, `--kob-error`, `--kob-info`).
 */
export function StatusBadge({ tone = "neutral", icon, children }: StatusBadgeProps) {
  return (
    <span className="kob-badge" data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}