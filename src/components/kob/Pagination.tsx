import { ChevronLeft, ChevronRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "./Button";

/** Global pagination. Direction icons flip with RTL. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
}: {
  page: number;
  pageCount: number;
  onPageChange: (next: number) => void;
  total?: number;
}) {
  const { t, dir, formatNumber } = useI18n();
  if (pageCount <= 1) return null;
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <nav className="kob-pagination" aria-label={t("common.actions.pagination")}>
      <Button
        size="sm"
        variant="secondary"
        disabled={page <= 1}
        leadingIcon={<Prev size={15} />}
        onClick={() => onPageChange(page - 1)}
      >
        {t("common.previous")}
      </Button>
      <span className="kob-pagination-status" aria-live="polite">
        {formatNumber(page)} / {formatNumber(pageCount)}
        {typeof total === "number" ? <small>{formatNumber(total)}</small> : null}
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={page >= pageCount}
        trailingIcon={<Next size={15} />}
        onClick={() => onPageChange(page + 1)}
      >
        {t("common.next")}
      </Button>
    </nav>
  );
}
