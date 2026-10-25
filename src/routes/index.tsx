import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Coffee,
  LogIn,
  Megaphone,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";

import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KOB — اشتراكات القهوة الذكية للمقاهي" },
      {
        name: "description",
        content:
          "KOB منصة اشتراكات قهوة يومية للمقاهي: العميل يمسح الكود ويشترك برقم جواله، والكاشير يعتمد الطلب بضغطة.",
      },
      { property: "og:title", content: "KOB — Smart Coffee Subscriptions" },
      {
        property: "og:description",
        content:
          "Daily coffee subscriptions for cafés: scan, subscribe by phone, approve at the counter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const COPY = {
  ar: {
    tag: "اشتراكات القهوة الذكية",
    login: "دخول المقاهي",
    eyebrow: "منصة اشتراكات للمقاهي",
    title: "قهوة عملائك اليومية… باشتراك واحد فاخر",
    lead: "KOB يحوّل زبائن مقهاك إلى مشتركين دائمين: دخل مقدّم، ولاء يومي، وإدارة كاملة للفروع والكاشير من مكان واحد.",
    ctaPrimary: "انضم كمقهى شريك",
    ctaSecondary: "دخول لوحة الإدارة",
    stats: [
      ["30", "يوم في كل باقة"],
      ["1", "ضغطة لاعتماد الطلب"],
      ["100%", "عزل بيانات كل مقهى"],
    ],
    howTitle: "كيف يعمل KOB؟",
    how: [
      ["أنشئ باقتك واطبع الكود", "حدّد المشروبات والأيام والسعر، وكل فرع له كود QR خاص."],
      ["العميل يمسح ويشترك", "يدخل رقم جواله، يتحقق برمز، ويختار باقته في ثوانٍ."],
      ["الكاشير يعتمد بضغطة", "يصل الطلب مباشرة للكاشير، وعند الاعتماد يُحتسب اليوم."],
    ],
    featTitle: "كل ما يحتاجه مقهاك",
    feats: [
      ["دخل مقدّم", "تحصيل قيمة الاشتراك مسبقاً وتدفق نقدي ثابت."],
      ["ولاء يومي", "العميل يرجع لك كل يوم بدل المنافسين."],
      ["إدارة الفروع", "فروع وموظفون وصلاحيات منفصلة لكل فرع."],
      ["تقارير وتحليلات", "استهلاك، إيرادات، وأداء الباقات لحظياً."],
      ["إعلانات في صفحة المسح", "اعرض عروضك لعملائك عند كل طلب."],
      ["أمان وتحقق", "رمز تحقق للعميل، وبيانات كل مقهى معزولة تماماً."],
    ],
    cardLabel: "عضوية بريميوم",
    cardDays: "الأيام المستخدمة",
    cardToday: "قهوة اليوم: لاتيه",
    finalTitle: "جاهز تطلق اشتراكات مقهاك؟",
    finalLead: "سجّل مقهاك اليوم وابدأ باستقبال المشتركين خلال دقائق.",
    footer: "جميع الحقوق محفوظة",
  },
  en: {
    tag: "Smart coffee subscriptions",
    login: "Café login",
    eyebrow: "Subscription platform for cafés",
    title: "Your customers' daily coffee… in one premium subscription",
    lead: "KOB turns walk-ins into loyal members: prepaid revenue, daily loyalty, and full control of branches and cashiers from one place.",
    ctaPrimary: "Become a partner café",
    ctaSecondary: "Open dashboard",
    stats: [
      ["30", "days in every plan"],
      ["1", "tap to approve an order"],
      ["100%", "data isolation per café"],
    ],
    howTitle: "How KOB works",
    how: [
      ["Create a plan, print the code", "Set drinks, days and price. Every branch gets its own QR code."],
      ["Customer scans & subscribes", "Phone number, a verification code, and a plan — in seconds."],
      ["Cashier approves in one tap", "The order reaches the counter instantly; approval marks the day."],
    ],
    featTitle: "Everything your café needs",
    feats: [
      ["Prepaid revenue", "Collect subscriptions upfront for steady cash flow."],
      ["Daily loyalty", "Customers come back to you every single day."],
      ["Branch management", "Separate branches, staff and permissions."],
      ["Reports & analytics", "Usage, revenue and plan performance in real time."],
      ["Ads on the scan page", "Show your promotions with every order."],
      ["Secure & verified", "Customer OTP and fully isolated data per café."],
    ],
    cardLabel: "Premium membership",
    cardDays: "Days used",
    cardToday: "Today: Latte",
    finalTitle: "Ready to launch your café subscriptions?",
    finalLead: "Register your café today and start welcoming members in minutes.",
    footer: "All rights reserved",
  },
} as const;

const HOW_ICONS = [QrCode, Smartphone, CheckCircle2];
const FEAT_ICONS = [Wallet, Users, Building2, BarChart3, Megaphone, ShieldCheck];

function Index() {
  const { lang } = useI18n();
  const c = COPY[lang === "ar" ? "ar" : "en"];

  return (
    <main className="kh-page">
      <header className="kh-header">
        <Link to="/" className="kh-brand">
          <span className="kh-brand-mark">
            <Coffee className="h-5 w-5" />
          </span>
          <span>
            <strong>KOB</strong>
            <small>{c.tag}</small>
          </span>
        </Link>
        <div className="kh-header-actions">
          <LanguageSwitcher />
          <Link to="/auth" className="kh-btn-ghost">
            <LogIn className="h-4 w-4" />
            <span>{c.login}</span>
          </Link>
        </div>
      </header>

      <section className="kh-hero">
        <div className="kh-hero-copy">
          <span className="kh-eyebrow">{c.eyebrow}</span>
          <h1>{c.title}</h1>
          <p>{c.lead}</p>
          <div className="kh-cta-row">
            <a href="#join" className="btn-brass px-7 py-3">
              {c.ctaPrimary}
            </a>
            <Link to="/auth" className="kh-btn-ghost kh-btn-lg">
              {c.ctaSecondary}
            </Link>
          </div>
          <div className="kh-stats">
            {c.stats.map(([n, l]) => (
              <div key={l} className="kh-stat">
                <strong>{n}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="kh-hero-visual" aria-hidden>
          <div className="kh-glow" />
          <div className="kh-card">
            <div className="kh-card-shine" />
            <div className="kh-card-top">
              <div>
                <strong>KOB</strong>
                <small>{c.cardLabel}</small>
              </div>
              <Coffee className="h-6 w-6" />
            </div>
            <div className="kh-card-days">
              <span>{c.cardDays}</span>
              <strong>12 / 30</strong>
              <div className="kh-card-bar">
                <i style={{ width: "40%" }} />
              </div>
            </div>
            <div className="kh-card-bottom">
              <span>{c.cardToday}</span>
              <span dir="ltr">05•• •••• 21</span>
            </div>
          </div>
        </div>
      </section>

      <section className="kh-section">
        <h2>{c.howTitle}</h2>
        <div className="kh-steps">
          {c.how.map(([title, body], i) => {
            const Icon = HOW_ICONS[i];
            return (
              <article key={title} className="kh-panel">
                <span className="kh-step-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="kh-icon">
                  <Icon className="h-6 w-6" />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="kh-section">
        <h2>{c.featTitle}</h2>
        <div className="kh-features">
          {c.feats.map(([title, body], i) => {
            const Icon = FEAT_ICONS[i];
            return (
              <article key={title} className="kh-panel kh-feature">
                <span className="kh-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="join" className="kh-final">
        <h2>{c.finalTitle}</h2>
        <p>{c.finalLead}</p>
        <div className="kh-cta-row kh-center">
          <Link to="/auth" className="btn-brass px-8 py-3">
            {c.ctaPrimary}
          </Link>
        </div>
      </section>

      <footer className="kh-footer">
        © {new Date().getFullYear()} KOB — {c.footer}
      </footer>
    </main>
  );
}
