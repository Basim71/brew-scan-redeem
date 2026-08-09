import type { ReactNode } from "react";
import { Inbox, RefreshCw, SearchX, TriangleAlert } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="kob-empty" role="status">
      <span className="kob-empty-icon" aria-hidden>{icon ?? <Inbox size={26} />}</span>
      <h3>{title ?? t("empty.title")}</h3>
      <p>{description ?? t("empty.description")}</p>
      {action ? <div className="kob-empty-action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="kob-error-state" role="alert">
      <span className="kob-error-icon" aria-hidden><TriangleAlert size={26} /></span>
      <h3>{title ?? t("errors.title")}</h3>
      <p>{description ?? t("errors.generic")}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} leadingIcon={<RefreshCw size={16} />}>
          {retryLabel ?? t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

/** Standard loading block for any async region. */
export function LoadingState({ label, rows = 3 }: { label?: string; rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="kob-loading-state" role="status" aria-live="polite">
      <span className="kob-loading-spinner" aria-hidden />
      <p>{label ?? t("common.loading")}</p>
      <div className="kob-loading-lines" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <span key={i} className="kob-skeleton" />
        ))}
      </div>
    </div>
  );
}

/** Failed load with a single retry affordance. */
export function RetryState({
  title,
  description,
  onRetry,
  retryLabel,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <ErrorState
      title={title ?? t("states.retryTitle")}
      description={description ?? t("states.retryDescription")}
      retryLabel={retryLabel ?? t("common.actions.retry")}
      onRetry={onRetry}
    />
  );
}

/** Filters/search returned nothing — distinct from "nothing exists yet". */
export function NoResultsState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={<SearchX size={26} />}
      title={title ?? t("states.noResultsTitle")}
      description={description ?? t("states.noResultsDescription")}
      action={action}
    />
  );
}
