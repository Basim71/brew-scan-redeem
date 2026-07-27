import { createFileRoute } from "@tanstack/react-router";

import { AuthLoadingScreen } from "@/features/authentication/components/AuthLoadingScreen";
import { UnifiedLoginForm } from "@/features/authentication/components/UnifiedLoginForm";
import { WorkspaceSelector } from "@/features/authentication/components/WorkspaceSelector";
import { useAuthentication } from "@/features/authentication/hooks/useAuthentication";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "KOB · Sign in" },
      { name: "description", content: "Unified sign-in for KOB platform and company workspaces." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { lang } = useI18n();
  const {
    phase,
    memberships,
    busy,
    error,
    noWorkspaceMessage,
    submit,
    selectWorkspace,
    signOutFromSelector,
  } = useAuthentication();

  if (phase === "loading") {
    return (
      <AuthLoadingScreen
        message={lang === "ar" ? "جارٍ التحقق من الجلسة..." : "Restoring session..."}
      />
    );
  }

  if (phase === "selector") {
    return (
      <WorkspaceSelector
        memberships={memberships}
        busy={busy}
        onSelect={(m) => void selectWorkspace(m)}
        onSignOut={() => void signOutFromSelector()}
      />
    );
  }

  const displayError = phase === "no_workspace" ? noWorkspaceMessage : error;

  return (
    <UnifiedLoginForm
      busy={busy}
      error={displayError}
      onSubmit={async (email, password) => {
        await submit(email, password);
      }}
    />
  );
}