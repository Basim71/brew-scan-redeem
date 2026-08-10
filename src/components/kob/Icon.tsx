import type { ReactNode } from "react";

export type IconSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<IconSize, number> = { xs: 14, sm: 16, md: 18, lg: 22 };

/**
 * Icon wrapper. The project standardizes on `lucide-react` only —
 * pass a lucide icon element as children and let this control the
 * size, stroke weight and alignment.
 */
export function Icon({
  size = "md",
  label,
  className = "",
  children,
}: {
  size?: IconSize | number;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <span
      className={`kob-icon ${className}`}
      style={{ fontSize: px, width: px, height: px }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </span>
  );
}

export const ICON_SIZES = SIZES;
