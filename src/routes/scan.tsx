import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coffee, Loader2, Check, Clock, XCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

type Step = "branch" | "language" | "phone" | "menu" | "waiting";

type Branch = { id: string; name: string; code: string };
type Subscription = {
  id: string; phone: string; customer_name: string | null;
  plan_name: string; days_total: number; days_used: number;
  active: boolean; expires_at: string | null;
};
type Coffee = { id: string; name_en: string; name_ar: string; is_active: boolean };

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Scan · KOB" }, { name: "description", content: "Scan a KOB branch, choose today's coffee, and send your order." }] }),
  component: ScanPage,
});

function ScanPage() {
  const { t, lang, setLang, dir, fmtNum } = useI18n();
  const [step, setStep] = useState<Step>("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [phone, setPhone] = useState("");
  const [sub, setSub] = useState<Subscription | null>(null);
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    supabase.from("branches").select("id,name,code").order("name").then(({ data }) => {
      const list = (data ?? []) as Branch[];
      setBranches(list);
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const b = list.find((x) => x.code === code);
        if (b) { setBranch(b); setStep("language"); }
      }
    });
  }, []);

  useEffect(() => {
    if (!branch) return;
    supabase.from("coffee_options").select("id,name_en,name_ar,is_active").eq("branch_id", branch.id).eq("is_active", true)
      .then(({ data }) => setCoffees((data ?? []) as Coffee[]));
  }, [branch]);

  // Poll order status
  useEffect(() => {
    if (!orderId) return;
    const int = setInterval(async () => {
      const { data } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
      if (data?.status && data.status !== orderStatus) setOrderStatus(data.status as any);
    }, 2000);
    return () => clearInterval(int);
  }, [orderId, orderStatus]);

  async function lookup() {
    setBusy(true); setErr(null);
    const { data } = await supabase.from("subscriptions").select("*").eq("phone", phone.trim()).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setBusy(false);
    if (!data) { setErr(t("noSub")); return; }
    setSub(data as Subscription); setStep("menu");
  }

  async function sendOrder(c: Coffee) {
    if (!sub || !branch) return;
    setBusy(true);
    const { data, error } = await supabase.from("orders").insert({
      subscription_id: sub.id, branch_id: branch.id, coffee_option_id: c.id,
      coffee_name: lang === "ar" ? c.name_ar : c.name_en, language: lang,
    }).select("id").single();
    setBusy(false);
    if (error || !data) { setErr(error?.message ?? "Failed"); return; }
    setOrderId(data.id); setOrderStatus("pending"); setStep("waiting");
  }

  const daysLeft = sub ? sub.days_total - sub.days_used : 0;

  return (
    <main dir={dir} className="min-h-screen py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-cream-dim hover:text-caramel-bright">
            <Coffee className="w-5 h-5" /><span className="font-display text-xl gold-text font-bold tracking-wider">KOB</span>
          </Link>
          <LanguageSwitcher />
        </div>

        {/* BRANCH */}
        {step === "branch" && (
          <div className="panel-warm p-7">
            <h1 className="font-display text-2xl font-bold text-cream mb-1">{t("pickBranch")}</h1>
            <p className="text-sm text-cream-dim mb-5">{t("scanHint")}</p>
            <div className="space-y-2">
              {branches.map((b) => (
                <button key={b.id} onClick={() => { setBranch(b); setStep("language"); }}
                  className="btn-ghost-brass w-full px-4 py-4 text-left flex justify-between items-center">
                  <span className="font-semibold text-cream">{b.name}</span>
                  <span className="font-mono text-xs text-cream-dim">{b.code}</span>
                </button>
              ))}
              {branches.length === 0 && <div className="engraved p-4 text-sm text-cream-dim text-center">{t("empty_branches")}</div>}
            </div>
          </div>
        )}

        {/* LANGUAGE */}
        {step === "language" && branch && (
          <div className="panel-warm p-7">
            <BackBtn onClick={() => setStep("branch")} label={t("back")} />
            <div className="engraved px-3 py-2 mb-5 text-xs uppercase tracking-widest text-cream-dim text-center">{branch.name}</div>
            <h1 className="font-display text-2xl font-bold text-cream mb-6 text-center">{t("pickLang")}</h1>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setLang("en"); setStep("phone"); }} className="btn-brass py-5 font-display text-xl">English</button>
              <button onClick={() => { setLang("ar"); setStep("phone"); }} className="btn-brass py-5 font-display text-xl">العربية</button>
            </div>
          </div>
        )}

        {/* PHONE */}
        {step === "phone" && branch && (
          <div className="panel-warm p-7">
            <BackBtn onClick={() => setStep("language")} label={t("back")} />
            <div className="engraved px-3 py-2 mb-5 text-xs uppercase tracking-widest text-cream-dim text-center">{branch.name}</div>
            <h1 className="font-display text-2xl font-bold text-cream mb-1 text-center">{t("enterPhone")}</h1>
            <p className="text-sm text-cream-dim mb-5 text-center">{t("tagline")}</p>
            <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="space-y-4">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required
                inputMode="tel" placeholder={t("phonePlaceholder")}
                className="inset-well w-full px-4 py-4 text-lg text-center font-mono tracking-widest outline-none focus:ring-2 focus:ring-caramel/60" />
              {err && <div className="engraved p-3 text-sm text-[oklch(0.78_0.16_32)] text-center">{err}</div>}
              <button disabled={busy} className="btn-brass w-full py-4 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t("lookup")}
              </button>
            </form>
            <p className="text-[10px] text-cream-dim text-center mt-4 opacity-60">{t("demoHint")}</p>
          </div>
        )}

        {/* MENU */}
        {step === "menu" && sub && branch && (
          <>
            <div className="panel-warm p-6 mb-4">
              <BackBtn onClick={() => setStep("phone")} label={t("back")} />
              <div className="engraved p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-cream-dim mb-1">{t("planLabel")}</div>
                <div className="font-display text-2xl font-bold text-cream">{sub.plan_name}</div>
                <div className="hairline-divider my-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-cream-dim">{t("branchLabel")}</span><span className="text-cream">{branch.name}</span>
                </div>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-sm text-cream-dim">{t("remainingLabel")}</span>
                  <span className="font-display gold-text text-3xl font-bold">{fmtNum(daysLeft)}<span className="text-sm text-cream-dim font-sans"> / {fmtNum(sub.days_total)}</span></span>
                </div>
              </div>
            </div>
            <div className="panel p-6">
              <h2 className="font-display text-xl font-bold text-cream mb-4">{t("pickCoffee")}</h2>
              <div className="grid grid-cols-2 gap-3">
                {coffees.map((c) => (
                  <button key={c.id} disabled={busy || daysLeft <= 0} onClick={() => sendOrder(c)}
                    className="engraved p-4 text-center hover:brightness-110 transition disabled:opacity-40">
                    <Coffee className="w-6 h-6 mx-auto mb-2 text-caramel-bright" />
                    <div className="font-display text-lg font-semibold text-cream">
                      {lang === "ar" ? c.name_ar : c.name_en}
                    </div>
                  </button>
                ))}
              </div>
              {daysLeft <= 0 && <div className="mt-4 engraved p-3 text-sm text-center text-cream-dim">{t("empty_days")}</div>}
            </div>
          </>
        )}

        {/* WAITING */}
        {step === "waiting" && (
          <div className="panel-warm p-8 text-center">
            {orderStatus === "pending" && (
              <>
                <div className="engraved w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5">
                  <Clock className="w-9 h-9 text-caramel-bright animate-pulse" />
                </div>
                <h1 className="font-display text-2xl font-bold text-cream mb-2">{t("waiting")}</h1>
                <p className="text-cream-dim text-sm">{t("waitingHint")}</p>
              </>
            )}
            {orderStatus === "approved" && (
              <>
                <div className="engraved w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5" style={{ boxShadow: "inset 0 0 30px oklch(0.65 0.15 155 / 0.4), var(--engrave)" }}>
                  <Check className="w-10 h-10 text-leaf" />
                </div>
                <h1 className="font-display text-2xl font-bold text-cream mb-2">{t("approvedMsg")}</h1>
              </>
            )}
            {orderStatus === "rejected" && (
              <>
                <div className="engraved w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5">
                  <XCircle className="w-10 h-10 text-[oklch(0.7_0.18_32)]" />
                </div>
                <h1 className="font-display text-2xl font-bold text-cream mb-2">{t("rejectedMsg")}</h1>
              </>
            )}
            <button onClick={() => { setOrderId(null); setOrderStatus("pending"); setStep("menu"); }}
              className="btn-ghost-brass mt-6 px-5 py-2.5 text-sm">{t("newOrder")}</button>
          </div>
        )}
      </div>
    </main>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-xs text-cream-dim hover:text-caramel-bright flex items-center gap-1 mb-4">
      <ArrowLeft className="w-3.5 h-3.5" /> {label}
    </button>
  );
}