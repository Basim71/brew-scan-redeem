import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Ban,
  Calendar,
  Clock,
  Coffee,
  Crown,
  History,
  Lightbulb,
  NotebookPen,
  Pause,
  Phone,
  QrCode,
  RefreshCcw,
  Sparkles,
  Ticket,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import type { CustomerAggregate } from "./aggregate";
import { customerInsights } from "./aggregate";
import { getNote, setNote } from "./notes";
import { updateSubscriptionStatus } from "./service";

type Props = {
  aggregate: CustomerAggregate | null;
  onClose: () => void;
  onChanged: () => void;
};

function fmtDate(iso: string | null, isRTL: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(isRTL ? "ar-SA" : "en-US");
}
function fmtDateTime(iso: string | null, isRTL: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(isRTL ? "ar-SA" : "en-US");
}

export function CustomerDrawer({ aggregate, onClose, onChanged }: Props) {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const isAr = lang === "ar";
  const [note, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aggregate) setNoteText(getNote(aggregate.customer.id));
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [aggregate?.customer.id]);

  const insights = useMemo(
    () => (aggregate ? customerInsights(aggregate, isAr ? "ar" : "en") : []),
    [aggregate, isAr],
  );

  if (!aggregate) return null;
  const a = aggregate;

  async function setSubStatus(id: string, status: "active" | "expired" | "cancelled") {
    setBusy(true);
    try {
      await updateSubscriptionStatus(id, status);
      toast.success(isAr ? "تم التحديث" : "Updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const monthsSinceReg = Math.max(
    1,
    Math.floor((Date.now() - new Date(a.customer.created_at).getTime()) / (30 * 86400000)),
  );
  const avgVisitsPerMonth = a.approvedCount / monthsSinceReg;
  const avgSpend = a.subscriptions.length ? a.totalSpend / a.subscriptions.length : 0;

  return (
    <>
      <div className="hub-drawer-scrim" onClick={onClose} aria-hidden />
      <aside className="hub-drawer" dir={isRTL ? "rtl" : "ltr"} role="dialog" aria-modal="true">
        <header className="hub-drawer-head">
          <div className="hub-drawer-identity">
            <div className="hub-avatar" aria-hidden>
              <User className="h-6 w-6" />
            </div>
            <div className="hub-drawer-name">
              <div className="hub-drawer-name-row">
                <strong>{a.customer.name}</strong>
                {a.isVip && (
                  <span className="hub-tag vip"><Crown className="h-3 w-3" />VIP</span>
                )}
                <span className={`hub-tag ${a.status}`}>
                  {isAr
                    ? { active: "نشط", expiring: "قارب على الانتهاء", expired: "منتهي", inactive: "غير نشط", new: "جديد" }[a.status]
                    : { active: "Active", expiring: "Expiring", expired: "Expired", inactive: "Inactive", new: "New" }[a.status]}
                </span>
              </div>
              <small dir="ltr">{a.customer.phone}</small>
            </div>
          </div>
          <button className="hub-icon-btn" onClick={onClose} aria-label={isAr ? "إغلاق" : "Close"}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="hub-drawer-body" ref={scrollRef}>
          {/* Overview */}
          <section className="hub-section">
            <h3><User className="h-4 w-4" />{isAr ? "نظرة عامة" : "Overview"}</h3>
            <div className="hub-grid-2">
              <div className="hub-kv"><span>{isAr ? "الهاتف" : "Phone"}</span><strong dir="ltr"><Phone className="h-3 w-3" />{a.customer.phone}</strong></div>
              <div className="hub-kv"><span>{isAr ? "معرّف QR" : "QR ID"}</span><strong dir="ltr"><QrCode className="h-3 w-3" />{a.customer.id.slice(0, 8)}</strong></div>
              <div className="hub-kv"><span>{isAr ? "تاريخ التسجيل" : "Registered"}</span><strong>{fmtDate(a.customer.created_at, isRTL)}</strong></div>
              <div className="hub-kv"><span>{isAr ? "الفرع الرئيسي" : "Primary Branch"}</span><strong>{a.primaryBranch ? (isAr ? a.primaryBranch.name_ar : a.primaryBranch.name_en) : "—"}</strong></div>
            </div>
          </section>

          {/* Loyalty */}
          <section className="hub-section">
            <h3><Award className="h-4 w-4" />{isAr ? "الولاء" : "Loyalty"}</h3>
            <div className={`hub-loyalty ${a.loyalty.tier}`}>
              <div className="hub-loyalty-score">{fmtNum(a.loyalty.score)}<small>/100</small></div>
              <div className="hub-loyalty-meta">
                <strong>{isAr
                  ? { excellent: "ممتاز", good: "جيد", attention: "بحاجة اهتمام" }[a.loyalty.tier]
                  : { excellent: "Excellent", good: "Good", attention: "Needs Attention" }[a.loyalty.tier]}
                </strong>
                <div className="hub-loyalty-bar"><span style={{ width: `${a.loyalty.score}%` }} /></div>
              </div>
            </div>
          </section>

          {/* Membership */}
          <section className="hub-section">
            <h3><Calendar className="h-4 w-4" />{isAr ? "العضوية" : "Membership"}</h3>
            {a.activeSubscription ? (
              <div className="hub-membership">
                <div className="hub-grid-2">
                  <div className="hub-kv"><span>{isAr ? "الخطة" : "Plan"}</span><strong>{isAr ? a.activeSubscription.plan?.name_ar : a.activeSubscription.plan?.name_en}</strong></div>
                  <div className="hub-kv"><span>{isAr ? "الحالة" : "Status"}</span><strong className={`hub-tag ${a.activeSubscription.status}`}>{a.activeSubscription.status}</strong></div>
                  <div className="hub-kv"><span>{isAr ? "تاريخ البدء" : "Start"}</span><strong>{fmtDate(a.activeSubscription.start_date, isRTL)}</strong></div>
                  <div className="hub-kv"><span>{isAr ? "تاريخ الانتهاء" : "End"}</span><strong>{fmtDate(a.activeSubscription.end_date, isRTL)}</strong></div>
                  <div className="hub-kv"><span>{isAr ? "الأيام المتبقية" : "Days Left"}</span><strong>{a.daysToExpire !== null ? fmtNum(Math.max(0, a.daysToExpire)) : "—"}</strong></div>
                  <div className="hub-kv"><span>{isAr ? "التجديدات" : "Renewals"}</span><strong>{fmtNum(a.renewals)}</strong></div>
                </div>
                <div className="hub-actions">
                  <button className="hub-btn primary" disabled={busy}><RefreshCcw className="h-3.5 w-3.5" />{isAr ? "تجديد" : "Renew"}</button>
                  <button className="hub-btn" disabled={busy}><TrendingUp className="h-3.5 w-3.5" />{isAr ? "ترقية" : "Upgrade"}</button>
                  <button className="hub-btn" disabled={busy} onClick={() => void setSubStatus(a.activeSubscription!.id, "cancelled")}>
                    <Pause className="h-3.5 w-3.5" />{isAr ? "إيقاف" : "Pause"}
                  </button>
                  <button className="hub-btn danger" disabled={busy} onClick={() => void setSubStatus(a.activeSubscription!.id, "cancelled")}>
                    <Ban className="h-3.5 w-3.5" />{isAr ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="hub-empty">{isAr ? "لا توجد عضوية نشطة" : "No active membership."}</p>
            )}
            {a.subscriptions.length > 0 && (
              <details className="hub-details">
                <summary>{isAr ? "سجل العضويات" : "Membership History"} ({fmtNum(a.subscriptions.length)})</summary>
                <ul className="hub-list">
                  {a.subscriptions.map((s) => (
                    <li key={s.id}>
                      <span>{isAr ? s.plan?.name_ar : s.plan?.name_en}</span>
                      <small>{fmtDate(s.start_date, isRTL)} → {fmtDate(s.end_date, isRTL)}</small>
                      <em className={`hub-tag ${s.status}`}>{s.status}</em>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {/* Favorite drinks & add-ons */}
          <section className="hub-section">
            <h3><Coffee className="h-4 w-4" />{isAr ? "المشروبات المفضّلة" : "Favorite Drinks"}</h3>
            {a.favoriteDrink ? (
              <div className="hub-fav">
                <strong>{isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en}</strong>
                <div className="hub-progress"><span style={{ width: `${a.favoriteDrink.pct}%` }} /></div>
                <small>{fmtNum(a.favoriteDrink.count)} × ({a.favoriteDrink.pct}%)</small>
              </div>
            ) : <p className="hub-empty">{isAr ? "لا توجد بيانات" : "No data yet."}</p>}
            <div className="hub-addons">
              <span>{isAr ? "جرعة إضافية" : "Extra Shot"}: <b>{fmtNum(a.addonCounts.extraShot)}</b></span>
              <span>{isAr ? "حليب" : "Milk"}: <b>{fmtNum(a.addonCounts.milk)}</b></span>
              <span>{isAr ? "نكهات" : "Syrups"}: <b>{fmtNum(a.addonCounts.syrup)}</b></span>
              <span>{isAr ? "سكر" : "Sugar"}: <b>{fmtNum(a.addonCounts.sugar)}</b></span>
            </div>
          </section>

          {/* Orders */}
          <section className="hub-section">
            <h3><Coffee className="h-4 w-4" />{isAr ? "آخر الطلبات" : "Recent Orders"}</h3>
            {a.orders.length === 0 ? (
              <p className="hub-empty">{isAr ? "لا توجد طلبات" : "No orders yet."}</p>
            ) : (
              <ul className="hub-list">
                {a.orders.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <span>{isAr ? o.drink?.name_ar : o.drink?.name_en}</span>
                    <small>{fmtDate(o.order_date, isRTL)} · {isAr ? o.branch?.name_ar : o.branch?.name_en}</small>
                    <em className={`hub-tag ${o.status}`}>{o.status}</em>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Coupons */}
          <section className="hub-section">
            <h3><Ticket className="h-4 w-4" />{isAr ? "الكوبونات" : "Coupons"}</h3>
            <p className="hub-empty">
              {isAr
                ? "الكوبونات مرتبطة بالخطط على مستوى الشركة."
                : "Coupons are tracked at the plan level."}
            </p>
          </section>

          {/* Statistics */}
          <section className="hub-section">
            <h3><TrendingUp className="h-4 w-4" />{isAr ? "الإحصائيات" : "Statistics"}</h3>
            <div className="hub-grid-2">
              <div className="hub-kv"><span>{isAr ? "إجمالي الطلبات" : "Total Orders"}</span><strong>{fmtNum(a.totalOrders)}</strong></div>
              <div className="hub-kv"><span>{isAr ? "الطلبات المعتمدة" : "Approved"}</span><strong>{fmtNum(a.approvedCount)}</strong></div>
              <div className="hub-kv"><span>{isAr ? "إجمالي الإنفاق" : "Total Spend"}</span><strong>{fmtNum(a.totalSpend)}</strong></div>
              <div className="hub-kv"><span>{isAr ? "متوسط الإنفاق" : "Avg Spend"}</span><strong>{fmtNum(Math.round(avgSpend))}</strong></div>
              <div className="hub-kv"><span>{isAr ? "متوسط الزيارات/شهر" : "Visits/mo"}</span><strong>{avgVisitsPerMonth.toFixed(1)}</strong></div>
              <div className="hub-kv"><span>{isAr ? "التجديدات" : "Renewals"}</span><strong>{fmtNum(a.renewals)}</strong></div>
            </div>
          </section>

          {/* Timeline */}
          <section className="hub-section">
            <h3><History className="h-4 w-4" />{isAr ? "الخط الزمني" : "Timeline"}</h3>
            <ul className="hub-timeline">
              <li><Clock className="h-3 w-3" /><span>{isAr ? "تسجيل العميل" : "Registered"}</span><small>{fmtDateTime(a.customer.created_at, isRTL)}</small></li>
              {a.subscriptions.slice(0, 5).map((s) => (
                <li key={s.id}><Sparkles className="h-3 w-3" /><span>{isAr ? "شراء عضوية" : "Bought membership"} · {isAr ? s.plan?.name_ar : s.plan?.name_en}</span><small>{fmtDateTime(s.created_at, isRTL)}</small></li>
              ))}
              {a.approvedOrders.slice(0, 5).map((o) => (
                <li key={o.id}><Coffee className="h-3 w-3" /><span>{isAr ? "استهلاك قهوة" : "Redeemed"} · {isAr ? o.drink?.name_ar : o.drink?.name_en}</span><small>{fmtDateTime(o.approved_at ?? o.created_at, isRTL)}</small></li>
              ))}
            </ul>
          </section>

          {/* Insights */}
          <section className="hub-section">
            <h3><Lightbulb className="h-4 w-4" />{isAr ? "رؤى العميل" : "Customer Insights"}</h3>
            {insights.length === 0 ? (
              <p className="hub-empty">{isAr ? "لا توجد رؤى بعد" : "No insights yet."}</p>
            ) : (
              <ul className="hub-insights-list">
                {insights.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section className="hub-section">
            <h3><NotebookPen className="h-4 w-4" />{isAr ? "ملاحظات داخلية" : "Internal Notes"}</h3>
            <textarea
              className="hub-textarea"
              value={note}
              rows={4}
              placeholder={isAr ? "ملاحظات مرئية للموظفين فقط…" : "Notes visible to staff only…"}
              onChange={(e) => {
                setNoteText(e.target.value);
                setNote(a.customer.id, e.target.value);
              }}
            />
          </section>
        </div>
      </aside>
    </>
  );
}