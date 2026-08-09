import type { ReactNode } from "react";

import { LiveStatusProvider } from "@/providers/LiveStatusProvider";

import { FloatingIsland, type FloatingIslandItem, type FloatingIslandLink } from "./FloatingIsland";

type AppWorkspaceProps = {
  title: string;
  subtitle?: string;
  homeTo: string;
  logoUrl?: string | null;
  items: FloatingIslandItem[];
  accountLinks?: FloatingIslandLink[];
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
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
}: AppWorkspaceProps) {
  return (
    <LiveStatusProvider>
      <main className="app-workspace">
        <FloatingIsland
          title={title}
          subtitle={subtitle}
          homeTo={homeTo}
          logoUrl={logoUrl}
          items={items}
          accountLinks={accountLinks}
          onSignOut={onSignOut}
        />
        <section className="app-workspace-content">{children}</section>
      </main>
    </LiveStatusProvider>
  );
}
