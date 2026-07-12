import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Coffee, CreditCard, Cog, Sparkles } from "lucide-react";

import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-caramel/10 bg-espresso-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="panel-warm flex h-12 w-12 items-center justify-center rounded-full">
              <Coffee className="h-6 w-6 text-caramel-bright" />
            </div>

            <div>
              <div className="font-display text-2xl font-bold tracking-wide gold-text">
                KOB
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim">
                {t("brand_tag")}
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <LanguageSwitcher />

            <Link to="/auth" className="btn-ghost-brass px-4 py-2 text-sm">
              {t("staff_login")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Interactive Coffee Story */}
      <section className="relative">
        <AmbientBackground />

        <StoryScene
          eyebrow={t("home_story_beginning")}
          title={t("home_story_subscription_title")}
          body={t("home_story_subscription_body")}
        >
          <SubscriptionCard />
        </StoryScene>

        <StoryScene
          eyebrow={t("home_story_transform")}
          title={t("home_story_beans_title")}
          body={t("home_story_beans_body")}
        >
          <CardToBeans />
        </StoryScene>

        <StoryScene
          eyebrow={t("home_story_grinding")}
          title={t("home_story_grinder_title")}
          body={t("home_story_grinder_body")}
        >
          <GrinderScene />
        </StoryScene>

        <StoryScene
          eyebrow={t("home_story_brewing")}
          title={t("home_story_machine_title")}
          body={t("home_story_machine_body")}
        >
          <BrewingScene />
        </StoryScene>

        <StoryScene
          eyebrow={t("home_story_daily_cup")}
          title={t("home_story_final_title")}
          body={t("home_story_final_body")}
        >
          <CupPresentation />
        </StoryScene>
      </section>
    </main>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,166,71,0.12),transparent_34%),linear-gradient(180deg,#1b0904_0%,#0b0302_100%)]" />
      <div className="absolute left-1/2 top-0 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-caramel/10 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-amber-900/20 blur-[110px]" />
    </div>
  );
}

function StoryScene({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="self-start lg:sticky lg:top-32">
        <div className="engraved mb-6 inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-cream-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-caramel" />
          {eyebrow}
        </div>

        <h1 className="mb-6 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
          <span className="gold-text">{title}</span>
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-cream-dim">
          {body}
        </p>
      </div>

      <div className="relative flex min-h-[520px] items-center justify-center">
        {children}
      </div>
    </section>
  );
}

function SubscriptionCard() {
  const { t } = useI18n();

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-10 rounded-full bg-caramel/20 blur-[80px]" />

      <div className="panel-warm relative overflow-hidden rounded-3xl p-8">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-caramel/70 to-transparent" />

        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-cream-dim">
              {t("home_card_label")}
            </div>
            <div className="font-display text-3xl font-bold text-cream">
              {t("home_card_title")}
            </div>
          </div>

          <div className="engraved flex h-14 w-14 items-center justify-center rounded-2xl">
            <CreditCard className="h-6 w-6 text-caramel-bright" />
          </div>
        </div>

        <div className="engraved mb-5 p-5">
          <div className="mb-3 flex justify-between text-sm">
            <span className="text-cream-dim">{t("home_card_plan")}</span>
            <span className="font-semibold text-cream">Plus</span>
          </div>

          <div className="mb-3 flex justify-between text-sm">
            <span className="text-cream-dim">{t("home_card_duration")}</span>
            <span className="font-semibold text-cream">
              {t("home_card_duration_value")}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-caramel-deep via-caramel to-caramel-bright" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-cream-dim">
            {t("home_card_daily")}
          </span>
          <span className="font-display text-2xl font-bold gold-text">
            KOB
          </span>
        </div>
      </div>
    </div>
  );
}

function CardToBeans() {
  const { t } = useI18n();
  const beans = Array.from({ length: 26 });

  return (
    <div className="relative flex h-[560px] w-full max-w-xl items-center justify-center">
      <div className="panel-warm absolute top-14 h-52 w-80 rotate-[-4deg] rounded-3xl opacity-70">
        <div className="absolute inset-x-8 top-10 h-3 rounded-full bg-caramel/30" />
        <div className="absolute inset-x-10 top-24 h-2 rounded-full bg-cream/10" />
        <div className="absolute inset-x-16 top-36 h-2 rounded-full bg-cream/10" />
      </div>

      <div className="absolute left-1/2 top-44 h-[280px] w-[360px] -translate-x-1/2">
        {beans.map((_, i) => {
          const x = (i % 7) * 48 - 145;
          const y = Math.floor(i / 7) * 48 + 10;
          const rot = (i * 37) % 90;

          return (
            <span
              key={i}
              className="bean absolute"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `${y}px`,
                transform: `rotate(${rot}deg)`,
              }}
            />
          );
        })}
      </div>

      <div className="absolute bottom-8 text-center">
        <div className="font-display text-2xl font-bold gold-text">
          {t("home_beans_caption")}
        </div>
      </div>
    </div>
  );
}

function GrinderScene() {
  const { t } = useI18n();

  return (
    <div className="relative flex h-[560px] w-full max-w-lg items-center justify-center">
      <FallingBeans />

      <div className="absolute top-24 h-20 w-72 rounded-[50%] border border-caramel/40 bg-gradient-to-b from-caramel/30 to-espresso-800 shadow-2xl" />

      <div className="panel-warm absolute top-36 flex h-64 w-80 flex-col items-center justify-center rounded-3xl">
        <Cog className="h-20 w-20 animate-spin text-caramel-bright [animation-duration:8s]" />

        <div className="engraved mt-6 px-6 py-3 text-center">
          <div className="font-display text-xl font-bold gold-text">
            {t("home_grinder_title")}
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim">
            {t("home_grinder_subtitle")}
          </div>
        </div>

        <div className="absolute -right-12 top-20 h-4 w-24 rounded-full bg-gradient-to-r from-espresso-700 to-caramel/70 shadow-xl" />
        <div className="panel-warm absolute -right-20 top-[72px] h-10 w-10 rounded-full" />
      </div>

      <div className="absolute bottom-16 h-40 w-28 rounded-full bg-gradient-to-b from-caramel/0 via-caramel-deep/60 to-caramel/0 opacity-80 blur-sm" />
    </div>
  );
}

function BrewingScene() {
  return (
    <div className="relative flex h-[560px] w-full max-w-xl items-center justify-center">
      <div className="absolute left-1/2 top-10 h-72 w-20 -translate-x-1/2 rounded-full bg-gradient-to-b from-caramel-deep/0 via-caramel/50 to-caramel-deep/0 blur-sm" />

      <div className="panel-warm relative h-[300px] w-[420px] rounded-3xl p-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="engraved flex h-20 w-20 items-center justify-center rounded-full">
            <Coffee className="h-9 w-9 text-caramel-bright" />
          </div>

          <div className="engraved flex h-24 w-24 items-center justify-center rounded-full">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-caramel-bright to-caramel-deep shadow-inner" />
          </div>
        </div>

        <div className="engraved flex h-20 items-center justify-center gap-4 rounded-2xl">
          <span className="h-3 w-3 rounded-full bg-leaf shadow-[0_0_20px_rgba(95,255,170,0.45)]" />
          <span className="h-3 w-3 rounded-full bg-caramel shadow-[0_0_20px_rgba(245,166,71,0.45)]" />
          <span className="h-3 w-3 rounded-full bg-ember shadow-[0_0_20px_rgba(255,100,50,0.35)]" />
        </div>

        <div className="absolute -bottom-12 left-1/2 h-24 w-36 -translate-x-1/2 rounded-b-[60px] border-x border-b border-caramel/30" />

        <Steam />
      </div>
    </div>
  );
}

function CupPresentation() {
  const { t } = useI18n();

  return (
    <div className="relative flex h-[560px] w-full max-w-xl items-center justify-center">
      <Steam />

      <div className="absolute top-24 h-44 w-2 rounded-full bg-gradient-to-b from-caramel-bright via-caramel to-caramel-deep shadow-[0_0_30px_rgba(245,166,71,0.5)]" />

      <div className="absolute bottom-28">
        <div className="relative">
          <div className="absolute -inset-12 rounded-full bg-caramel/20 blur-[70px]" />

          <div className="relative flex h-40 w-72 items-center justify-center rounded-b-[90px] rounded-t-[28px] border border-caramel/40 bg-gradient-to-b from-espresso-700 to-espresso-900 shadow-2xl">
            <div className="absolute left-8 right-8 top-5 h-8 rounded-full bg-gradient-to-b from-caramel-bright to-caramel-deep opacity-90" />
            <Coffee className="mt-12 h-10 w-10 text-caramel-bright" />

            <div className="absolute -right-14 top-10 h-20 w-20 rounded-full border-[14px] border-caramel/40" />
          </div>

          <div className="mx-auto mt-4 h-8 w-80 rounded-[50%] border border-caramel/20 bg-gradient-to-b from-caramel/30 to-espresso-900" />
        </div>
      </div>

      <div className="absolute bottom-4 flex items-center gap-2 text-caramel-bright">
        <Sparkles className="h-5 w-5" />
        <span className="font-display text-2xl font-bold gold-text">
          {t("home_served")}
        </span>
      </div>
    </div>
  );
}

function FallingBeans() {
  return (
    <div className="absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="bean absolute"
          style={{
            left: `${(i * 37) % 260}px`,
            top: `${(i * 19) % 150}px`,
            transform: `rotate(${(i * 29) % 120}deg)`,
            opacity: 0.65 + (i % 3) * 0.1,
          }}
        />
      ))}
    </div>
  );
}

function Steam() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className="steam absolute left-[42%] top-16 block h-20 w-2 rounded-full bg-cream/20 blur-sm" />
      <span className="steam absolute left-[52%] top-10 block h-24 w-2 rounded-full bg-cream/20 blur-sm [animation-delay:0.7s]" />
      <span className="steam absolute left-[60%] top-20 block h-16 w-2 rounded-full bg-cream/20 blur-sm [animation-delay:1.3s]" />
    </div>
  );
}
