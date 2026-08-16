import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info, ShieldAlert, TriangleAlert, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button, IconButton } from "./Button";
import { Modal } from "./Modal";

type BaseDialog = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

/** Dialog wrapping a form: submit + cancel footer, loading state handled. */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  cancelLabel,
  busy,
  size = "md",
  submitDisabled,
}: BaseDialog & {
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  size?: "sm" | "md" | "lg";
  submitDisabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel ?? t("common.actions.cancel")}
          </Button>
          <Button loading={busy} disabled={submitDisabled} onClick={onSubmit}>
            {submitLabel ?? t("common.actions.save")}
          </Button>
        </>
      }
    >
      <form
        className="kob-dialog-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {children}
      </form>
    </Modal>
  );
}

/** Read-only dialog with a single dismiss action. */
export function InformationDialog({ open, onClose, title, description, children, closeLabel }: BaseDialog & { closeLabel?: string }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="kob-dialog-title">
          <Info size={18} aria-hidden />
          {title}
        </span>
      }
      description={description}
      size="sm"
      footer={<Button variant="secondary" onClick={onClose}>{closeLabel ?? t("common.actions.close")}</Button>}
    >
      {children}
    </Modal>
  );
}

/** Cautionary confirmation (reversible but risky). */
export function WarningDialog({
  open,
  onClose,
  title,
  description,
  children,
  onConfirm,
  confirmLabel,
  busy,
}: BaseDialog & { onConfirm: () => void; confirmLabel?: string; busy?: boolean }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="kob-dialog-title" data-tone="warning">
          <TriangleAlert size={18} aria-hidden />
          {title}
        </span>
      }
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.actions.cancel")}
          </Button>
          <Button variant="gold" loading={busy} onClick={onConfirm}>
            {confirmLabel ?? t("common.actions.confirm")}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/** Destructive confirmation — the only place danger actions are confirmed. */
export function DangerDialog({
  open,
  onClose,
  title,
  description,
  children,
  onConfirm,
  confirmLabel,
  busy,
}: BaseDialog & { onConfirm: () => void; confirmLabel?: string; busy?: boolean }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="kob-dialog-title" data-tone="danger">
          <ShieldAlert size={18} aria-hidden />
          {title}
        </span>
      }
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.actions.cancel")}
          </Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>
            {confirmLabel ?? t("common.actions.delete")}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

function useDialogShell(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      restore.current?.focus?.();
    };
  }, [open, onClose]);
  return panelRef;
}

/** Immersive dialog for wizards and live sessions. */
export function FullScreenDialog({ open, onClose, title, description, children, footer }: BaseDialog & { footer?: ReactNode }) {
  const { t, dir } = useI18n();
  const panelRef = useDialogShell(open, onClose);
  const titleId = useId();
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="kob-fullscreen-backdrop" dir={dir}>
      <div ref={panelRef} className="kob-fullscreen" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="kob-modal-header">
          <div className="kob-min-w-0">
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <IconButton label={t("common.actions.close")} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="kob-fullscreen-body">{children}</div>
        {footer ? <footer className="kob-modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Side drawer (detail panels). Slides from the inline-end edge or appears centered. */
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
  position = "default",
}: BaseDialog & { footer?: ReactNode; width?: "sm" | "md" | "lg"; position?: "default" | "island" | "center" }) {
  const { t, dir } = useI18n();
  const panelRef = useDialogShell(open, onClose);
  const titleId = useId();
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="kob-drawer-backdrop" data-position={position} dir={dir} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        ref={panelRef}
        className="kob-drawer"
        data-position={position}
        data-width={width}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="kob-modal-header">
          <div className="kob-min-w-0">
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <IconButton label={t("common.actions.close")} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="kob-drawer-body">{children}</div>
        {footer ? <footer className="kob-modal-footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}
