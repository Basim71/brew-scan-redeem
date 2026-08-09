import { useEffect, useRef, useState, type ReactNode } from "react";

/** Global dropdown menu — click outside / ESC to dismiss, keyboard reachable. */
export function Dropdown({
  trigger,
  children,
  align = "end",
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="kob-dropdown" ref={wrapRef}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div className="kob-dropdown-panel" data-align={align} role="menu" aria-label={label}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  onSelect,
  icon,
  tone = "default",
  children,
}: {
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button type="button" role="menuitem" className="kob-dropdown-item" data-tone={tone} onClick={onSelect}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

/** Tooltip using the native title fallback plus a styled bubble on hover/focus. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="kob-tooltip" data-label={label}>
      {children}
      <span className="kob-tooltip-bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}
