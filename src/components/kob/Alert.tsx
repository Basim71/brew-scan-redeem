import type { ReactNode } from "react";
import { CircleCheck, Info, ShieldAlert, TriangleAlert, X } from "lucide-react";

import { IconButton } from "./Button";

export type AlertTone = "info" | "success" | "warning" | "danger";

const ICONS: Record<AlertTone, ReactNode> = {
  info: <Info size={18} />,
  success: <CircleCheck size={18} />,
  warning: <TriangleAlert size={18} />,
  danger: <ShieldAlert size={18} />,
};

/** Inline banner feedback. Toasts are transient — alerts persist in place. */
export function Alert({
  tone = "info",
  title,
  children,
  icon,
  actions,
  onDismiss,
  dismissLabel = "Dismiss",
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return (
    <div className="kob-alert" data-tone={tone} role={tone === "danger" || tone === "warning" ? "alert" : "note"}>
      <span className="kob-alert-icon" aria-hidden>
        {icon ?? ICONS[tone]}
      </span>
      <div className="kob-alert-body">
        {title ? <strong className="kob-alert-title">{title}</strong> : null}
        {children ? <div>{children}</div> : null}
        {actions ? <div className="kob-alert-actions">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton className="kob-alert-close" label={dismissLabel} size="sm" onClick={onDismiss}>
          <X size={16} />
        </IconButton>
      ) : null}
    </div>
  );
}
