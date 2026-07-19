import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
export const Route=createFileRoute("/platform/settings")({component:Page});
function Page(){return <div className="platform-page" dir="rtl"><header className="platform-page-header"><div><span>Configuration</span><h1>إعدادات المنصة</h1><p>سيتم ربط إعدادات البريد والرسائل والفوترة في المرحلة التالية.</p></div><Settings/></header><div className="platform-empty">الأساس جاهز، وإعدادات الخدمات الخارجية مؤجلة حتى اعتماد مزودي الخدمة.</div></div>}
