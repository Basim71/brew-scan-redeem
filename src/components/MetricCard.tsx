import type { LucideIcon } from "lucide-react";

export type MetricCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  hint?: string;
};

export function MetricCard({ label, value, icon: Icon, loading = false, hint }: MetricCardProps) {
  return (
    <article className="metric-card" aria-busy={loading}>
      <div className="metric-card-icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="metric-card-copy">
        <span>{label}</span>
        <strong>{loading ? "—" : value.toLocaleString("ar-SA")}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}
