import type { ReactNode } from "react";

export type TabItem = { id: string; label: string; icon?: ReactNode; badge?: ReactNode };

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="kob-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className="kob-tab"
          data-active={value === item.id || undefined}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.badge != null ? <em>{item.badge}</em> : null}
        </button>
      ))}
    </div>
  );
}
