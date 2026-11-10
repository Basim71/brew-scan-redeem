import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/features/company/settings/useCompanySettings";
import { CafePage } from "@/features/company/cafe/ui";
import { DrinkDialog } from "@/features/company/drinks/DrinkDialog";
import {
  draftFromRecord,
  listStudioDrinks,
  setDrinkActive,
} from "@/features/company/drinks/service";
import type { DrinkDraft, DrinkRecord } from "@/features/company/drinks/types";

export const Route = createFileRoute("/admin/drinks")({
  head: () => ({
    meta: [
      { title: "Drinks · KOB" },
      { name: "description", content: "Café drink menu." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DrinksPage,
});

function DrinksPage() {
  const { t, lang, fmtNum } = useI18n();
  const isAr = lang === "ar";
  const [drinks, setDrinks] = useState<DrinkRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DrinkDraft | null | undefined>(
    undefined,
  );
  const [messagesOpen, setMessagesOpen] = useState(false);
  const { settings, save } = useCompanySettings();

  async function load() {
    try {
      setDrinks(await listStudioDrinks());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.drinks.loadError"),
      );
    }
  }

  useEffect(() => {
    void load();
    if (window.location.hash === "#new") setDialog(null);
  }, []);

  async function toggle(drink: DrinkRecord) {
    try {
      await setDrinkActive(drink.id, !drink.is_active);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.drinks.saveError"),
      );
    }
  }

  return (
    <CafePage
      title={t("cafe.drinks.title")}
      subtitle={t("cafe.drinks.subtitle", { n: fmtNum(drinks.length) })}
      action={
        <button
          type="button"
          className="cafe-btn"
          onClick={() => setDialog(null)}
        >
          {t("cafe.drinks.new")}
        </button>
      }
    >
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-grid-4">
        {drinks.map((drink) => {
          const options = drink.option_groups
            .map((group) => (isAr ? group.name_ar : group.name_en))
            .filter(Boolean);
          return (
            <article className="cafe-drink" key={drink.id}>
              {drink.image_url ? (
                <img src={drink.image_url} alt="" />
              ) : (
                <div className="ph" />
              )}
              <div className="in">
                <div className="ar">{isAr ? drink.name_ar : drink.name_en}</div>
                <div className="en" dir="ltr">
                  {isAr ? drink.name_en : drink.name_ar}
                </div>
                <div className="cafe-muted">
                  {options.length
                    ? t("cafe.drinks.options", { list: options.join("، ") })
                    : t("cafe.drinks.noOptions")}
                </div>
                <div className="ft">
                  <button
                    type="button"
                    className={
                      drink.is_active ? "cafe-switch" : "cafe-switch off"
                    }
                    onClick={() => void toggle(drink)}
                  >
                    <i />
                    {drink.is_active
                      ? t("cafe.drinks.available")
                      : t("cafe.drinks.hidden")}
                  </button>
                  <button
                    type="button"
                    className="cafe-link"
                    onClick={() => setDialog(draftFromRecord(drink))}
                  >
                    {t("cafe.edit")}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {settings ? (
        <section className="cafe-card">
          <h2>
            {t("cafe.drinks.messages")}
            <button
              type="button"
              className="cafe-link"
              onClick={() => setMessagesOpen((value) => !value)}
            >
              {messagesOpen ? t("cafe.hide") : t("cafe.show")}
            </button>
          </h2>
          {messagesOpen ? (
            <div className="cafe-two">
              {(
                [
                  [
                    "welcome_message_ar",
                    "welcome_message_en",
                    "cafe.drinks.welcome",
                  ],
                  [
                    "empty_subscription_message_ar",
                    "empty_subscription_message_en",
                    "cafe.drinks.emptySub",
                  ],
                  [
                    "loyalty_message_ar",
                    "loyalty_message_en",
                    "cafe.drinks.loyalty",
                  ],
                ] as const
              ).map(([arKey, enKey, label]) => (
                <label key={arKey}>
                  <span className="cafe-label">{t(label)}</span>
                  <input
                    className="cafe-input"
                    value={(isAr ? settings[arKey] : settings[enKey]) ?? ""}
                    onChange={(event) => {
                      const key = isAr ? arKey : enKey;
                      void save({ [key]: event.target.value }, "experience");
                    }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="cafe-muted">{t("cafe.drinks.messagesHint")}</p>
          )}
        </section>
      ) : null}
      {dialog !== undefined ? (
        <DrinkDialog
          initial={dialog ?? undefined}
          onClose={() => setDialog(undefined)}
          onSaved={() => {
            setDialog(undefined);
            void load();
          }}
        />
      ) : null}
    </CafePage>
  );
}
