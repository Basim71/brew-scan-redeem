import type { ReactNode } from "react";
import { CompanySidebar } from "./CompanySidebar";

type Props = {
  title: string;
  subtitle: string;
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
};

export function CompanyLayout({ title, subtitle, onSignOut, children }: Props) {
  return (
    <div className="company-shell">
      <CompanySidebar title={title} subtitle={subtitle} onSignOut={onSignOut} />
      <main className="company-main">
        <div className="company-main-inner">{children}</div>
      </main>
    </div>
  );
}