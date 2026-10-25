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
import arLocale from "@/locales/ar.json";
import enLocale from "@/locales/en.json";

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

const COPY = { ar: arLocale.home, en: enLocale.home };

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
