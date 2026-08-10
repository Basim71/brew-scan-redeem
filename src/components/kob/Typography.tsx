import type { ElementType, ReactNode } from "react";

export type TypeVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "bodySm"
  | "caption"
  | "label"
  | "button"
  | "nav"
  | "table";

export type TypeTone = "primary" | "secondary" | "muted" | "inverse" | "danger" | "success";

const DEFAULT_TAG: Record<TypeVariant, ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  body: "p",
  bodySm: "p",
  caption: "span",
  label: "span",
  button: "span",
  nav: "span",
  table: "span",
};

export type TextProps = {
  variant?: TypeVariant;
  tone?: TypeTone;
  as?: ElementType;
  align?: "start" | "center" | "end";
  numeric?: boolean;
  truncate?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
};

/**
 * Single typography primitive for the whole product.
 * Never hand-roll font sizes — pick a variant.
 */
export function Text({
  variant = "body",
  tone = "primary",
  as,
  align,
  numeric,
  truncate,
  className = "",
  id,
  children,
}: TextProps) {
  const Tag = (as ?? DEFAULT_TAG[variant]) as ElementType;
  return (
    <Tag
      id={id}
      className={`kob-type ${className}`}
      data-variant={variant}
      data-tone={tone === "primary" ? undefined : tone}
      data-align={align && align !== "start" ? align : undefined}
      data-numeric={numeric || undefined}
      data-truncate={truncate || undefined}
    >
      {children}
    </Tag>
  );
}

export const Display = (p: Omit<TextProps, "variant">) => <Text variant="display" {...p} />;
export const Heading1 = (p: Omit<TextProps, "variant">) => <Text variant="h1" {...p} />;
export const Heading2 = (p: Omit<TextProps, "variant">) => <Text variant="h2" {...p} />;
export const Heading3 = (p: Omit<TextProps, "variant">) => <Text variant="h3" {...p} />;
export const Heading4 = (p: Omit<TextProps, "variant">) => <Text variant="h4" {...p} />;
export const Body = (p: Omit<TextProps, "variant">) => <Text variant="body" {...p} />;
export const BodySmall = (p: Omit<TextProps, "variant">) => <Text variant="bodySm" {...p} />;
export const Caption = (p: Omit<TextProps, "variant">) => <Text variant="caption" {...p} />;
export const Label = (p: Omit<TextProps, "variant">) => <Text variant="label" {...p} />;
