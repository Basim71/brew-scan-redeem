import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, Languages, LogOut, Menu, UserRound, X, type LucideIcon } from "lucide-react";
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

export function FloatingIsland({ title, subtitle, homeTo, items, onSignOut }: FloatingIslandProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const groupWrapRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (groupWrapRef.current && !groupWrapRef.current.contains(target)) {
        setActiveGroup(null);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveGroup(null);
        setAccountOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setActiveGroup(null);
    setAccountOpen(false);
    setOpen(false);
  }, [pathname]);

  return (
    <header className="app-island-anchor">
      <div className="app-island" data-open={open ? "true" : "false"} data-scrolled={scrolled ? "true" : "false"}>
        <div className="app-island-zone app-island-zone-brand">
          <Link
            to={homeTo as never}
            className="app-island-brand"
            aria-label={title}
            onClick={() => {
              setOpen(false);
              setActiveGroup(null);
            }}
          >
            <span className="app-island-logo" aria-hidden="true">
              K
            </span>
            <span className="app-island-brand-copy">
              <strong>{title}</strong>
              {subtitle ? <small>{subtitle}</small> : null}
            </span>
          </Link>
        </div>

        <nav className="app-island-zone app-island-zone-nav app-island-nav" aria-label={title} ref={groupWrapRef}>
          {items.map((item) => {
            if (isGroup(item)) {
              const Icon = item.icon;
              const isActive = item.children.some((c) => matchPath(pathname, c.to, c.exact));
              const isOpen = activeGroup === item.label;
              return (
                <div key={`group:${item.label}`} className="app-island-group" data-open={isOpen ? "true" : "false"}>
                  <button
                    type="button"
                    className={"app-island-link app-island-group-trigger" + (isActive ? " app-island-link-active" : "")}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setAccountOpen(false);
                      setActiveGroup((cur) => (cur === item.label ? null : item.label));
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <ChevronDown className="app-island-chevron h-3.5 w-3.5" />
                  </button>
                  <div className="app-island-dropdown" role="menu" data-open={isOpen ? "true" : "false"}>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.to}
                          to={child.to as never}
                          role="menuitem"
                          activeOptions={{ exact: Boolean(child.exact) }}
                          className="app-island-dropdown-item"
                          activeProps={{ className: "app-island-dropdown-item app-island-dropdown-item-active" }}
                          onClick={() => {
                            setActiveGroup(null);
                            setOpen(false);
                          }}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
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

        <div className="app-island-zone app-island-zone-actions app-island-actions">
          <button
            type="button"
            className="app-island-quiet-button"
            aria-label={lang === "ar" ? "الإشعارات" : "Notifications"}
            title={lang === "ar" ? "الإشعارات" : "Notifications"}
          >
            <Bell className="h-4 w-4" />
            <span className="app-island-notification-dot" aria-hidden="true" />
          </button>

          <div className="app-island-account" ref={accountRef} data-open={accountOpen ? "true" : "false"}>
            <button
              type="button"
              className="app-island-account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => {
                setActiveGroup(null);
                setAccountOpen((current) => !current);
              }}
            >
              <span className="app-island-avatar">
                <UserRound className="h-4 w-4" />
              </span>
              <ChevronDown className="app-island-chevron h-3.5 w-3.5" />
            </button>

            <div className="app-island-account-menu" role="menu" data-open={accountOpen ? "true" : "false"}>
              <div className="app-island-account-heading">
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </div>
              <div className="app-island-account-row">
                <Languages className="h-4 w-4" />
                <LanguageSwitcher />
              </div>
              <button
                type="button"
                className="app-island-account-action app-island-account-action-danger"
                onClick={() => void onSignOut()}
              >
                <LogOut className="h-4 w-4" />
                <span>{t("signOut")}</span>
              </button>
            </div>
          </div>

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
