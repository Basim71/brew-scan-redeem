import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldX } from "lucide-react";
import { usePlatform, type PlatformRole } from "./PlatformProvider";

export function PlatformGate({ children, allow }: { children: ReactNode; allow?: PlatformRole[] }) {
  const navigate = useNavigate();
  const { session, profile, ready, error } = usePlatform();
  useEffect(() => { if (ready && !session) navigate({ to: "/platform-auth", replace: true }); }, [ready, session, navigate]);
  if (!ready) return <div className="platform-state"><Loader2 className="h-7 w-7 animate-spin" /><span>جاري التحقق من صلاحية المنصة…</span></div>;
  if (!session) return null;
  if (!profile || (allow && !allow.includes(profile.role))) return <div className="platform-state platform-denied"><ShieldX className="h-9 w-9" /><h2>لا توجد صلاحية دخول</h2><p>{error || "هذا الحساب ليس من حسابات إدارة منصة KOB."}</p></div>;
  return children;
}
