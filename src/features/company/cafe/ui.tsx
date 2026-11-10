import type { ReactNode } from "react";

export function CafePage({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="cafe-page">
      <header className="cafe-hd">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="cafe-sub">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function CafeDialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="cafe-dim" role="presentation" onMouseDown={onClose}>
      <div
        className="cafe-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cafe-modal-h">
          <b>{title}</b>
          <button type="button" onClick={onClose} aria-label="close">
            ×
          </button>
        </header>
        <div className="cafe-modal-b">{children}</div>
        <footer className="cafe-modal-f">{footer}</footer>
      </div>
    </div>
  );
}
