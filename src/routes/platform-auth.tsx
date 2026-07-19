import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/components/platform/PlatformProvider";

export const Route = createFileRoute("/platform-auth" as any)({ component: PlatformAuth });
function PlatformAuth() {
  const navigate = useNavigate();
  const { profile, ready, refresh } = usePlatform();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [show,setShow]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  useEffect(() => { if (ready && profile) navigate({ to: "/platform" as any, replace: true }); }, [ready,profile,navigate]);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(null); const { error: signError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); if (signError) { setError("بيانات الدخول غير صحيحة."); setBusy(false); return; } await refresh(); const { data } = await (supabase as any).rpc("get_my_platform_profile"); if (!data?.length) { await supabase.auth.signOut(); setError("الحساب غير مخول لإدارة المنصة."); setBusy(false); return; } navigate({ to: "/platform" as any, replace: true }); }
  return <main className="platform-auth-page" dir="rtl"><section className="platform-auth-card"><div className="platform-auth-brand"><span><ShieldCheck /></span><div><strong>KOB Platform</strong><small>بوابة الإدارة المركزية</small></div></div><form onSubmit={submit}><label><Mail/><input type="email" placeholder="البريد الإلكتروني" required value={email} onChange={e=>setEmail(e.target.value)} dir="ltr"/></label><label><LockKeyhole/><input type={show?"text":"password"} placeholder="كلمة المرور" required value={password} onChange={e=>setPassword(e.target.value)} dir="ltr"/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></label>{error&&<p className="platform-auth-error">{error}</p>}<button className="platform-primary-button" disabled={busy}>{busy?<Loader2 className="animate-spin"/>:"دخول المنصة"}</button></form></section></main>;
}
