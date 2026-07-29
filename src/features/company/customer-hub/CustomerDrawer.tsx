import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, Coffee, History, NotebookPen, Phone, QrCode, Sparkles, User, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { CustomerAggregate } from "./aggregate";
import { getNote, setNote } from "./notes";

type Props = {
  aggregate: CustomerAggregate | null;
  onClose: () => void;
};

function fmtDate(iso: string | null, isRTL: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(isRTL ? "ar-SA" : "en-US");
}
function fmtDateTime(iso: string | null, isRTL: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(isRTL ? "ar-SA" : "en-US");
}

export function CustomerDrawer({ aggregate, onClose }: Props) {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const isAr = lang === "ar";
  const [note, setNoteText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aggregate) setNoteText(getNote(aggregate.customer.id));
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [aggregate?.customer.id]);

  if (!aggregate) return null;
  const a = aggregate;

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
                <span className={`hub-tag ${a.status}`}>
                  {isAr
                    ? {
                        active: "نشط",
                        expiring: "قارب على الانتهاء",
                        expired: "منتهي",
                        no_membership: "بدون عضوية",
                      }[a.status]
                    : { active: "Active", expiring: "Expiring", expired: "Expired", no_membership: "No Membership" }[
                        a.status
                      ]}
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
            <h3>
              <User className="h-4 w-4" />
              {isAr ? "نظرة عامة" : "Overview"}
            </h3>
            <div className="hub-grid-2">
              <div className="hub-kv">
                <span>{isAr ? "الهاتف" : "Phone"}</span>
                <strong dir="ltr">
                  <Phone className="h-3 w-3" />
                  {a.customer.phone}
                </strong>
              </div>
              <div className="hub-kv">
                <span>{isAr ? "معرّف QR" : "QR ID"}</span>
                <strong dir="ltr">
                  <QrCode className="h-3 w-3" />
                  {a.customer.id.slice(0, 8)}
                </strong>
              </div>
              <div className="hub-kv">
                <span>{isAr ? "تاريخ التسجيل" : "Registered"}</span>
                <strong>{fmtDate(a.customer.created_at, isRTL)}</strong>
              </div>
              <div className="hub-kv">
                <span>{isAr ? "الفرع الرئيسي" : "Primary Branch"}</span>
                <strong>{a.primaryBranch ? (isAr ? a.primaryBranch.name_ar : a.primaryBranch.name_en) : "—"}</strong>
              </div>
            </div>
          </section>

          {/* Membership */}
          <section className="hub-section">
            <h3>
              <Calendar className="h-4 w-4" />
              {isAr ? "العضوية" : "Membership"}
            </h3>
            {a.activeSubscription ? (
              <div className="hub-membership">
                <div className="hub-grid-2">
                  <div className="hub-kv">
                    <span>{isAr ? "الخطة" : "Plan"}</span>
                    <strong>{isAr ? a.activeSubscription.plan?.name_ar : a.activeSubscription.plan?.name_en}</strong>
                  </div>
                  <div className="hub-kv">
                    <span>{isAr ? "الحالة" : "Status"}</span>
                    <strong className={`hub-tag ${a.activeSubscription.status}`}>{a.activeSubscription.status}</strong>
                  </div>
                  <div className="hub-kv">
                    <span>{isAr ? "تاريخ البدء" : "Start"}</span>
                    <strong>{fmtDate(a.activeSubscription.start_date, isRTL)}</strong>
                  </div>
                  <div className="hub-kv">
                    <span>{isAr ? "تاريخ الانتهاء" : "End"}</span>
                    <strong>{fmtDate(a.activeSubscription.end_date, isRTL)}</strong>
                  </div>
                  <div className="hub-kv">
                    <span>{isAr ? "الأيام المتبقية" : "Days Left"}</span>
                    <strong>{a.daysToExpire !== null ? fmtNum(Math.max(0, a.daysToExpire)) : "—"}</strong>
                  </div>
                  <div className="hub-kv">
                    <span>{isAr ? "التجديدات" : "Renewals"}</span>
                    <strong>{fmtNum(a.renewals)}</strong>
                  </div>
                </div>
                <div className="hub-membership-owner">
                  <span>{isAr ? "إدارة العضوية" : "Membership management"}</span>
                  <strong>{isAr ? "تتم بواسطة العميل فقط" : "Customer managed only"}</strong>
                </div>
              </div>
            ) : (
              <p className="hub-empty">{isAr ? "لا توجد عضوية نشطة" : "No active membership."}</p>
            )}
            {a.subscriptions.length > 0 && (
              <details className="hub-details">
                <summary>
                  {isAr ? "سجل العضويات" : "Membership History"} ({fmtNum(a.subscriptions.length)})
                </summary>
                <ul className="hub-list">
                  {a.subscriptions.map((s) => (
                    <li key={s.id}>
                      <span>{isAr ? s.plan?.name_ar : s.plan?.name_en}</span>
                      <small>
                        {fmtDate(s.start_date, isRTL)} → {fmtDate(s.end_date, isRTL)}
                      </small>
                      <em className={`hub-tag ${s.status}`}>{s.status}</em>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {/* Favorite drinks & add-ons */}
          <section className="hub-section">
            <h3>
              <Coffee className="h-4 w-4" />
              {isAr ? "المشروبات المفضّلة" : "Favorite Drinks"}
            </h3>
            {a.favoriteDrink ? (
              <div className="hub-fav">
                <strong>{isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en}</strong>
                <div className="hub-progress">
                  <span style={{ width: `${a.favoriteDrink.pct}%` }} />
                </div>
                <small>
                  {fmtNum(a.favoriteDrink.count)} × ({a.favoriteDrink.pct}%)
                </small>
              </div>
            ) : (
              <p className="hub-empty">{isAr ? "لا توجد بيانات" : "No data yet."}</p>
            )}
            <div className="hub-addons">
              <span>
                {isAr ? "جرعة إضافية" : "Extra Shot"}: <b>{fmtNum(a.addonCounts.extraShot)}</b>
              </span>
              <span>
                {isAr ? "حليب" : "Milk"}: <b>{fmtNum(a.addonCounts.milk)}</b>
              </span>
              <span>
                {isAr ? "نكهات" : "Syrups"}: <b>{fmtNum(a.addonCounts.syrup)}</b>
              </span>
              <span>
                {isAr ? "سكر" : "Sugar"}: <b>{fmtNum(a.addonCounts.sugar)}</b>
              </span>
            </div>
          </section>

          {/* Orders */}
          <section className="hub-section">
            <h3>
              <Coffee className="h-4 w-4" />
              {isAr ? "آخر الطلبات" : "Recent Orders"}
            </h3>
            {a.orders.length === 0 ? (
              <p className="hub-empty">{isAr ? "لا توجد طلبات" : "No orders yet."}</p>
            ) : (
              <ul className="hub-list">
                {a.orders.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <span>{isAr ? o.drink?.name_ar : o.drink?.name_en}</span>
                    <small>
                      {fmtDate(o.order_date, isRTL)} · {isAr ? o.branch?.name_ar : o.branch?.name_en}
                    </small>
                    <em className={`hub-tag ${o.status}`}>{o.status}</em>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Timeline */}
          <section className="hub-section">
            <h3>
              <History className="h-4 w-4" />
              {isAr ? "الخط الزمني" : "Timeline"}
            </h3>
            <ul className="hub-timeline">
              <li>
                <Clock className="h-3 w-3" />
                <span>{isAr ? "تسجيل العميل" : "Registered"}</span>
                <small>{fmtDateTime(a.customer.created_at, isRTL)}</small>
              </li>
              {a.subscriptions.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {isAr ? "شراء عضوية" : "Bought membership"} · {isAr ? s.plan?.name_ar : s.plan?.name_en}
                  </span>
                  <small>{fmtDateTime(s.created_at, isRTL)}</small>
                </li>
              ))}
              {a.approvedOrders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Coffee className="h-3 w-3" />
                  <span>
                    {isAr ? "استهلاك قهوة" : "Redeemed"} · {isAr ? o.drink?.name_ar : o.drink?.name_en}
                  </span>
                  <small>{fmtDateTime(o.approved_at ?? o.created_at, isRTL)}</small>
                </li>
              ))}
            </ul>
          </section>

          {/* Notes */}
          <section className="hub-section">
            <h3>
              <NotebookPen className="h-4 w-4" />
              {isAr ? "ملاحظات داخلية" : "Internal Notes"}
            </h3>
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
