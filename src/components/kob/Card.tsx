import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "surface" | "raised" | "engraved" | "espresso";
  interactive?: boolean;
};

export function Card({ tone = "raised", interactive, className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`kob-card ${className}`}
      data-tone={tone}
      data-interactive={interactive || undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="kob-card-header">
      <div className="kob-card-header-copy">
        {icon ? <span className="kob-card-header-icon" aria-hidden>{icon}</span> : null}
        <div className="kob-min-w-0">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {action ? <div className="kob-card-header-action">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`kob-card-body ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`kob-card-footer ${className}`}>{children}</div>;
}
