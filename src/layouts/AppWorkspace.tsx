import type { ReactNode } from "react";

import { LiveStatusProvider } from "@/providers/LiveStatusProvider";

import {
  FloatingIsland,
  type FloatingIslandItem,
  type FloatingIslandLink,
} from "./FloatingIsland";

type AppWorkspaceProps = {
  title: string;
  subtitle?: string;
  homeTo: string;
  logoUrl?: string | null;
  items: FloatingIslandItem[];
  accountLinks?: FloatingIslandLink[];
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
  shell?: "cafe" | "cashier";
  avatarLabel?: string;
  showBell?: boolean;
  bellTo?: string;
};

export function AppWorkspace({
  title,
  subtitle,
  homeTo,
  logoUrl,
  items,
  accountLinks,
  onSignOut,
  children,
  shell,
  avatarLabel,
  showBell,
  bellTo,
}: AppWorkspaceProps) {
  return (
    <LiveStatusProvider>
      <main className={"app-workspace" + (shell ? ` ${shell}-shell` : "")}>
        <FloatingIsland
          title={title}
          subtitle={subtitle}
          homeTo={homeTo}
          logoUrl={logoUrl}
          items={items}
          accountLinks={accountLinks}
          onSignOut={onSignOut}
          avatarLabel={avatarLabel}
          showBell={showBell}
          bellTo={bellTo}
        />
        <section className="app-workspace-content">{children}</section>
      </main>
    </LiveStatusProvider>
  );
}
