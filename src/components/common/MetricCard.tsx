import type { LucideIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export type MetricCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  hint?: string;
};

export function MetricCard({ label, value, icon: Icon, loading = false, hint }: MetricCardProps) {
  const { fmtNum } = useI18n();
  return (
    <article className="metric-card" aria-busy={loading}>
      <div className="metric-card-icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="metric-card-copy">
        <span>{label}</span>
        <strong>{loading ? "—" : fmtNum(value)}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}
