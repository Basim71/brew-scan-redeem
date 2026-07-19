import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Clock3, MessageCircle, Paperclip, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { addCaseMessage, getCase } from "@/modules/customer-success/api";
import { caseStatusLabels, priorityLabels, type CustomerSuccessCase } from "@/modules/customer-success/types";

export const Route = createFileRoute("/admin/customer-success/$caseId" as any)({ component: CompanyCaseDetails });

function CompanyCaseDetails() {
  const { caseId } = Route.useParams() as { caseId: string };
  const [item,setItem]=useState<CustomerSuccessCase|null>(null);
  const [messages,setMessages]=useState<any[]>([]);
  const [body,setBody]=useState("");
  async function load(){
    setItem(await getCase(caseId));
    const {data}=await (supabase as any).from("customer_success_case_messages").select("id,body,visibility,created_at,sender_user_id").eq("case_id",caseId).eq("visibility","shared").order("created_at");
    setMessages(data??[]);
  }
  useEffect(()=>{void load();const c=supabase.channel(`case-${caseId}`).on("postgres_changes",{event:"*",schema:"public",table:"customer_success_case_messages",filter:`case_id=eq.${caseId}`},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[caseId]);
  async function send(e:FormEvent){e.preventDefault();if(!body.trim())return;await addCaseMessage(caseId,body);setBody("");await load();}
  if(!item)return <div className="cs-empty">جارٍ تحميل الحالة...</div>;
  return <div className="cs-page" dir="rtl"><header className="cs-case-header"><div><span>{item.caseNumber}</span><h1>{item.title}</h1><p>{item.description}</p></div><div><span className={`status-${item.status}`}>{caseStatusLabels[item.status]}</span><span className={`priority-${item.priority}`}>{priorityLabels[item.priority]}</span></div></header>
    <div className="cs-workspace"><main className="cs-thread"><div className="cs-section-title"><h2><MessageCircle/> المحادثة</h2></div><div className="cs-messages">{messages.map(m=><article key={m.id}><p>{m.body}</p><time>{new Date(m.created_at).toLocaleString("ar-SA")}</time></article>)}{!messages.length&&<div className="cs-empty">ابدأ المحادثة مع فريق KOB.</div>}</div><form className="cs-composer" onSubmit={send}><button type="button" title="المرفقات"><Paperclip/></button><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="اكتب رسالتك..."/><button className="cs-primary"><Send/></button></form></main>
    <aside className="cs-sidebar"><section><h3><Clock3/> معلومات الحالة</h3><dl><dt>الحالة</dt><dd>{caseStatusLabels[item.status]}</dd><dt>الأولوية</dt><dd>{priorityLabels[item.priority]}</dd><dt>تاريخ الإنشاء</dt><dd>{new Date(item.requestedAt).toLocaleString("ar-SA")}</dd><dt>الموعد</dt><dd>{item.scheduledAt?new Date(item.scheduledAt).toLocaleString("ar-SA"):"غير محدد"}</dd></dl></section><section><h3><ShieldCheck/> الصلاحيات</h3><ul><li>{item.allowView?"✓":"—"} مشاهدة</li><li>{item.allowTemporaryEdit?"✓":"—"} تعديل مؤقت</li><li>{item.allowVoice?"✓":"—"} صوت</li><li>{item.allowRecording?"✓":"—"} تسجيل</li></ul></section></aside></div>
  </div>;
}
