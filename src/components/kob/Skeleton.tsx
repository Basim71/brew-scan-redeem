import { Loader2 } from "lucide-react";

export function Skeleton({
  width,
  height = "1rem",
  radius,
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      className={`kob-skeleton ${className}`}
      aria-hidden
      style={{ width: width ?? "100%", height, borderRadius: radius }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="kob-skeleton-stack" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} height="0.75rem" />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="kob-card kob-skeleton-card" data-tone="raised" aria-hidden>
      <Skeleton width="40%" height="1.1rem" />
      <SkeletonText lines={lines} />
    </div>
  );
}

export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="kob-skeleton-metrics" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={1} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="kob-skeleton-table" aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="kob-skeleton-row">
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} height="0.85rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span className="kob-spinner" role="status" aria-live="polite">
      <Loader2 className="kob-spin" size={size} aria-hidden />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function LoadingBlock({ label, minHeight = 220 }: { label?: string; minHeight?: number }) {
  return (
    <div className="kob-loading-block" style={{ minHeight }}>
      <Spinner label={label} />
    </div>
  );
}
