import { Link } from "@tanstack/react-router";
import { Coffee, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export type FloatingIslandItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type FloatingIslandProps = {
  title: string;
  subtitle?: string;
  homeTo: string;
  items: FloatingIslandItem[];
  onSignOut: () => void | Promise<void>;
};

export function FloatingIsland({
  title,
  subtitle,
  homeTo,
  items,
  onSignOut,
}: FloatingIslandProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="app-island-anchor">
      <div className="app-island" data-open={open ? "true" : "false"}>
        <Link
          to={homeTo as never}
          className="app-island-brand"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <span className="app-island-logo">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="app-island-brand-copy">
            <strong>{title}</strong>
            {subtitle ? <small>{subtitle}</small> : null}
          </span>
        </Link>

        <nav className="app-island-nav" aria-label={title}>
          {items.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to as never}
              activeOptions={{ exact: Boolean(exact) }}
              className="app-island-link"
              activeProps={{ className: "app-island-link app-island-link-active" }}
              title={label}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="app-island-actions">
          <div className="app-island-language">
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="app-island-icon-button"
            aria-label={t("signOut")}
            title={t("signOut")}
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="app-island-menu-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
