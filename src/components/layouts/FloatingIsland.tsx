import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Coffee,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export type FloatingIslandLink = {
  kind?: "link";
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type FloatingIslandGroup = {
  kind: "group";
  label: string;
  icon: LucideIcon;
  children: FloatingIslandLink[];
};

export type FloatingIslandItem = FloatingIslandLink | FloatingIslandGroup;

function isGroup(item: FloatingIslandItem): item is FloatingIslandGroup {
  return (item as FloatingIslandGroup).kind === "group";
}

function matchPath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

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
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const groupWrapRef = useRef<HTMLDivElement | null>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!activeGroup) return;
    function onClick(e: MouseEvent) {
      if (!groupWrapRef.current) return;
      if (!groupWrapRef.current.contains(e.target as Node)) setActiveGroup(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveGroup(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [activeGroup]);

  // Close dropdowns/mobile menu on route change
  useEffect(() => {
    setActiveGroup(null);
    setOpen(false);
  }, [pathname]);

  return (
    <header className="app-island-anchor">
      <div className="app-island" data-open={open ? "true" : "false"}>
        <Link
          to={homeTo as never}
          className="app-island-brand"
          aria-label={title}
          onClick={() => {
            setOpen(false);
            setActiveGroup(null);
          }}
        >
          <span className="app-island-logo">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="app-island-brand-copy">
            <strong>{title}</strong>
            {subtitle ? <small>{subtitle}</small> : null}
          </span>
        </Link>

        <nav className="app-island-nav" aria-label={title} ref={groupWrapRef}>
          {items.map((item) => {
            if (isGroup(item)) {
              const Icon = item.icon;
              const isActive = item.children.some((c) =>
                matchPath(pathname, c.to, c.exact),
              );
              const isOpen = activeGroup === item.label;
              return (
                <div
                  key={`group:${item.label}`}
                  className="app-island-group"
                  data-open={isOpen ? "true" : "false"}
                >
                  <button
                    type="button"
                    className={
                      "app-island-link app-island-group-trigger" +
                      (isActive ? " app-island-link-active" : "")
                    }
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setActiveGroup((cur) => (cur === item.label ? null : item.label))
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <ChevronDown
                      className="app-island-chevron h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen ? (
                    <div className="app-island-dropdown" role="menu">
                      {item.children.map((c) => {
                        const CIcon = c.icon;
                        return (
                          <Link
                            key={c.to}
                            to={c.to as never}
                            role="menuitem"
                            activeOptions={{ exact: Boolean(c.exact) }}
                            className="app-island-dropdown-item"
                            activeProps={{
                              className:
                                "app-island-dropdown-item app-island-dropdown-item-active",
                            }}
                            onClick={() => {
                              setActiveGroup(null);
                              setOpen(false);
                            }}
                          >
                            <CIcon className="h-4 w-4" />
                            <span>{c.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            const { to, label, icon: Icon, exact } = item;
            return (
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
            );
          })}
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
