import type { ReactNode } from "react";
import { Info, TriangleAlert } from "lucide-react";

/** Page shell — the single source of page margins and content width. */
export function PageContainer({
  size = "lg",
  className = "",
  children,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`kob-page ${className}`} data-size={size}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  icon,
  action,
  level = 2,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3 | 4;
}) {
  const Heading = (`h${level}` as const) as "h2";
  return (
    <div className="kob-section-header">
      <div className="kob-section-header-copy">
        {icon ? <span className="kob-section-header-icon" aria-hidden>{icon}</span> : null}
        <div className="kob-min-w-0">
          <Heading className="kob-section-title">{title}</Heading>
          {description ? <p className="kob-section-desc">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="kob-section-header-action">{action}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  icon,
  action,
  footer,
  className = "",
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`kob-section ${className}`}>
      {title ? <SectionHeader title={title} description={description} icon={icon} action={action} /> : null}
      <div className="kob-section-body">{children}</div>
      {footer ? <SectionFooter>{footer}</SectionFooter> : null}
    </section>
  );
}

export function SectionFooter({ children }: { children: ReactNode }) {
  return <div className="kob-section-footer">{children}</div>;
}

/** KPI tile. One geometry for every metric in the product. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  trend,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "gold";
  trend?: ReactNode;
}) {
  return (
    <article className="kob-stat" data-tone={tone}>
      {icon ? <span className="kob-stat-icon" aria-hidden>{icon}</span> : null}
      <div className="kob-min-w-0">
        <p className="kob-stat-label">{label}</p>
        <p className="kob-stat-value">{value}</p>
        {hint ? <p className="kob-stat-hint">{hint}</p> : null}
      </div>
      {trend ? <div className="kob-stat-trend">{trend}</div> : null}
    </article>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="kob-stat-grid">{children}</div>;
}

/** Informational callout. */
export function InfoCard({ title, children, icon }: { title?: ReactNode; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="kob-callout" data-tone="info" role="note">
      <span className="kob-callout-icon" aria-hidden>{icon ?? <Info size={18} />}</span>
      <div className="kob-min-w-0">
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** Cautionary callout — pairs an icon with the color, never color alone. */
export function WarningCard({ title, children, icon }: { title?: ReactNode; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="kob-callout" data-tone="warning" role="alert">
      <span className="kob-callout-icon" aria-hidden>{icon ?? <TriangleAlert size={18} />}</span>
      <div className="kob-min-w-0">
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
