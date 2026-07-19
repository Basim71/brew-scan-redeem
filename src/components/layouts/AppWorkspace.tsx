import type { ReactNode } from "react";

import { FloatingIsland, type FloatingIslandItem } from "./FloatingIsland";

type AppWorkspaceProps = {
  title: string;
  subtitle?: string;
  homeTo: string;
  items: FloatingIslandItem[];
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
};

export function AppWorkspace({
  title,
  subtitle,
  homeTo,
  items,
  onSignOut,
  children,
}: AppWorkspaceProps) {
  return (
    <main className="app-workspace">
      <FloatingIsland
        title={title}
        subtitle={subtitle}
        homeTo={homeTo}
        items={items}
        onSignOut={onSignOut}
      />
      <section className="app-workspace-content">{children}</section>
    </main>
  );
}
