import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Building2, Headphones, LayoutDashboard, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { AppWorkspace } from "@/components/layouts/AppWorkspace";
import { PlatformGate } from "@/components/platform/PlatformGate";
import { usePlatform } from "@/components/platform/PlatformProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform")({ component: PlatformLayout });
function PlatformLayout() {
 const navigate=useNavigate(); const { profile }=usePlatform();
 const items=[
  {to:"/platform",label:"الرئيسية",icon:LayoutDashboard,exact:true},
  {to:"/platform/companies",label:"الشركات",icon:Building2},
  {to:"/platform/support",label:"مركز الدعم",icon:Headphones},
  {to:"/platform/users",label:"فريق المنصة",icon:UsersRound},
  {to:"/platform/settings",label:"الإعدادات",icon:Settings},
 ];
 async function signOut(){await supabase.auth.signOut();navigate({to:"/platform-auth" as any,replace:true});}
 return <PlatformGate><div className="platform-shell"><AppWorkspace title="KOB Platform" subtitle={`${profile?.fullName ?? ""} · ${profile?.role ?? ""}`} homeTo="/platform" items={items} onSignOut={signOut}><Outlet/></AppWorkspace></div></PlatformGate>;
}
