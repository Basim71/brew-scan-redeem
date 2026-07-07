import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, QrCode, ShieldCheck, ClipboardList } from "lucide-react";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { t, fmtNum } = useI18n();
  const features = [
    { icon: QrCode, t: t("feat1_t"), b: t("feat1_b") },
    { icon: Coffee, t: t("feat2_t"), b: t("feat2_b") },
    { icon: ClipboardList, t: t("feat3_t"), b: t("feat3_b") },
  ];
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="panel-warm w-12 h-12 rounded-full flex items-center justify-center">
            <Coffee className="w-6 h-6 text-caramel-bright" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold gold-text tracking-wide">KOB</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim">{t("brand_tag")}</div>
          </div>
        </div>
        <nav className="flex gap-2 items-center">
          <LanguageSwitcher />
          <Link to="/auth" className="btn-ghost-brass px-4 py-2 text-sm">{t("staff_login")}</Link>
          <Link to="/scan" className="btn-brass px-4 py-2 text-sm">{t("scan_branch")}</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 engraved px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-cream-dim mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-caramel"></span>
            {t("heroBadge")}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] mb-6">
            {t("heroTitleA")} <br />
            <span className="gold-text">{t("heroTitleB")}</span>
          </h1>
          <p className="text-cream-dim text-lg leading-relaxed mb-8 max-w-lg">
            {t("heroBody")}
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/scan" className="btn-brass px-6 py-3.5 inline-flex items-center gap-2">
              <QrCode className="w-4 h-4" /> {t("tryCustomer")}
            </Link>
            <Link to="/auth" className="btn-ghost-brass px-6 py-3.5 inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {t("staffDashboard")}
            </Link>
          </div>
        </div>

        <div className="panel-warm p-8 relative overflow-hidden">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
            <span className="steam block w-1.5 h-6 rounded-full bg-cream/40" style={{ animationDelay: "0s" }} />
            <span className="steam block w-1.5 h-8 rounded-full bg-cream/30" style={{ animationDelay: "0.6s" }} />
            <span className="steam block w-1.5 h-6 rounded-full bg-cream/40" style={{ animationDelay: "1.2s" }} />
          </div>
          <div className="mt-16 engraved p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-cream-dim mb-2">{t("todaysCoupon")}</div>
            <div className="flex items-baseline justify-between">
              <div className="font-display text-3xl font-bold text-cream">Flat White</div>
              <div className="gold-text font-mono text-lg">#{fmtNum(428)}</div>
            </div>
            <div className="hairline-divider my-4" />
            <div className="flex justify-between text-sm">
              <span className="text-cream-dim">{t("col_branch")}</span>
              <span className="text-cream">Downtown</span>
            </div>
            <div className="flex justify-between text-sm mt-1.5">
              <span className="text-cream-dim">{t("remainingLabel")}</span>
              <span className="text-caramel-bright font-semibold">{t("remainingDays", { n: fmtNum(27), total: fmtNum(30) })}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { l: t("st_approved"), n: 128 },
              { l: t("st_pending"), n: 3 },
              { l: t("st_active"), n: 964 },
            ].map((s, i) => (
              <div key={i} className="engraved px-2 py-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-cream-dim">{s.l}</div>
                <div className="gold-text font-display text-xl font-bold mt-0.5">{fmtNum(s.n)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className="panel p-6">
            <div className="engraved w-11 h-11 rounded-full flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-caramel-bright" />
            </div>
            <h3 className="text-xl font-semibold text-cream mb-1.5">{f.t}</h3>
            <p className="text-cream-dim text-sm leading-relaxed">{f.b}</p>
          </div>
        ))}
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-center text-xs text-cream-dim tracking-widest uppercase">
        {t("footer")}
      </footer>
    </main>
  );
}
