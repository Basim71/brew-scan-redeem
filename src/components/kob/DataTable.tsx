import type { ReactNode } from "react";

import { EmptyState } from "./States";
import { SkeletonTable } from "./Skeleton";

export type Column<T> = {
  key: string;
  header: string;
  align?: "start" | "center" | "end";
  numeric?: boolean;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  caption,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  caption: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
}) {
  if (loading) return <SkeletonTable columns={columns.length} />;
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  return (
    <div className="kob-table-scroll">
      <table className="kob-table">
        <caption className="kob-sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" data-align={c.align ?? "start"}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((c) => (
                <td key={c.key} data-align={c.align ?? "start"} data-numeric={c.numeric || undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
