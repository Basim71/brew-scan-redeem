import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

/** Unified KOB button. Never style buttons ad-hoc — use variants. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  leadingIcon,
  trailingIcon,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`kob-btn ${className}`}
      data-variant={variant}
      data-size={size}
      data-block={block || undefined}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="kob-spin" size={16} aria-hidden /> : leadingIcon}
      {children ? <span className="kob-btn-label">{children}</span> : null}
      {!loading && trailingIcon ? trailingIcon : null}
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`kob-btn kob-icon-btn ${className}`}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  );
}
