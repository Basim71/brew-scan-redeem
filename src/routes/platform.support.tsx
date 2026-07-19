import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Headphones, Radio, Search, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCases } from "@/modules/customer-success/api";
import { caseStatusLabels, priorityLabels, type CustomerSuccessCase } from "@/modules/customer-success/types";

export const Route = createFileRoute("/platform/support")({ component: SupportCenter });

function SupportCenter(){
  const navigate=useNavigate();
  const [rows,setRows]=useState<CustomerSuccessCase[]>([]);
  const [tab,setTab]=useState("open");
  const [search,setSearch]=useState("");
  const [error,setError]=useState<string|null>(null);
  async function load(){try{setRows(await listCases());setError(null)}catch(e){setError(e instanceof Error?e.message:"تعذر تحميل الحالات")}}
  useEffect(()=>{void load();const channel=supabase.channel("platform-customer-success").on("postgres_changes",{event:"*",schema:"public",table:"customer_success_cases"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[]);
  const shown=useMemo(()=>rows.filter(r=>{
    const q=search.trim().toLowerCase();
    const matches=!q||`${r.caseNumber} ${r.title} ${r.description} ${r.organization?.name_ar??""} ${r.organization?.name_en??""}`.toLowerCase().includes(q);
    const tabMatch=tab==="all"||(tab==="open"&&!["closed","cancelled"].includes(r.status))||(tab==="waiting"&&["new","triaged","waiting_platform"].includes(r.status))||(tab==="scheduled"&&r.status==="scheduled")||(tab==="active"&&r.status==="active")||(tab==="closed"&&["resolved","closed"].includes(r.status));
    return matches&&tabMatch;
  }),[rows,search,tab]);
  const stats={waiting:rows.filter(r=>["new","triaged","waiting_platform"].includes(r.status)).length,active:rows.filter(r=>r.status==="active").length,scheduled:rows.filter(r=>r.status==="scheduled").length,critical:rows.filter(r=>r.priority==="critical"&&!['closed','cancelled'].includes(r.status)).length};
  return <div className="platform-page cs-page" dir="rtl"><header className="platform-page-header"><div><span>Customer Success</span><h1>مركز حالات العملاء</h1><p>فرز الحالات، تعيين الموظفين، إدارة الموافقات والجلسات من مساحة عمل واحدة.</p></div><div className="platform-live-pill"><i/> تحديث مباشر</div></header>
    {error&&<div className="cs-error"><AlertTriangle/>{error}</div>}
    <section className="cs-stats"><article><Headphones/><div><b>{stats.waiting}</b><span>بانتظار الاستلام</span></div></article><article><Radio/><div><b>{stats.active}</b><span>جلسات نشطة</span></div></article><article><CalendarClock/><div><b>{stats.scheduled}</b><span>مجدولة</span></div></article><article><AlertTriangle/><div><b>{stats.critical}</b><span>حالات حرجة</span></div></article></section>
    <div className="cs-toolbar"><div className="support-tabs">{[["open","المفتوحة",Headphones],["waiting","الواردة",UserCheck],["scheduled","مجدولة",CalendarClock],["active","نشطة",Radio],["closed","المغلقة",CheckCircle2],["all","الكل",Search]].map(([id,label,Icon]:any)=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon/>{label}</button>)}</div><label className="cs-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث برقم الحالة أو الشركة..."/></label></div>
    <div className="support-request-grid">{shown.map(r=><article key={r.id} className={`support-request-card priority-${r.priority}`}><div className="support-request-top"><span>{r.caseNumber}</span><b>{priorityLabels[r.priority]}</b></div><h3>{r.title}</h3><p>{r.organization?.name_ar||r.organization?.name_en||"شركة"}</p><div className="cs-card-status"><span className={`status-${r.status}`}>{caseStatusLabels[r.status]}</span><span>{r.category}</span></div><footer><time>{new Date(r.scheduledAt||r.requestedAt).toLocaleString("ar-SA")}</time><button className="platform-primary-button" onClick={()=>navigate({to:"/platform/support/$caseId" as any,params:{caseId:r.id} as any})}>فتح الحالة</button></footer></article>)}{!shown.length&&<div className="platform-empty">لا توجد حالات مطابقة.</div>}</div>
  </div>;
}
