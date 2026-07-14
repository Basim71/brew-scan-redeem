import {
  Coffee,
  Loader2,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";

import type { Drink } from "./types";

type DrinkCardProps = {
  drink: Drink;
  language: "ar" | "en";
  position: number;
  active: boolean;
  flipped: boolean;
  orderMode: boolean;
  busy: boolean;
  canOrder: boolean;
  onSelect: () => void;
  onFlip: () => void;
  onOrder: () => void;
};

export function DrinkCard({
  drink,
  language,
  position,
  active,
  flipped,
  orderMode,
  busy,
  canOrder,
  onSelect,
  onFlip,
  onOrder,
}: DrinkCardProps) {
  const primaryName =
    language === "ar"
      ? drink.name_ar
      : drink.name_en;

  const secondaryName =
    language === "ar"
      ? drink.name_en
      : drink.name_ar;

  function handleCardClick() {
    if (!active) {
      onSelect();
      return;
    }

    if (orderMode) {
      onFlip();
    }
  }

  return (
    <article
      className={[
        "kob-voyager-card",
        active
          ? "kob-voyager-card-active"
          : "",
        flipped
          ? "kob-voyager-card-flipped"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--card-position": position,
        } as React.CSSProperties
      }
      aria-hidden={!active}
    >
      <div className="kob-voyager-card-inner">
        <button
          type="button"
          className="kob-voyager-card-face kob-voyager-card-front"
          onClick={handleCardClick}
          aria-label={
            active && orderMode
              ? language === "ar"
                ? `فتح طلب ${primaryName}`
                : `Open ${primaryName} order`
              : primaryName
          }
        >
          {drink.image_url ? (
            <img
              src={drink.image_url}
              alt={primaryName}
              draggable={false}
              className="kob-voyager-card-image"
            />
          ) : (
            <div className="kob-voyager-card-placeholder">
              <Coffee className="h-16 w-16" />
            </div>
          )}

          <div className="kob-voyager-card-overlay" />

          <div className="kob-voyager-card-copy">
            <span className="kob-voyager-card-name">
              {primaryName}
            </span>

            <span className="kob-voyager-card-secondary-name">
              {secondaryName}
            </span>

            {active && orderMode && (
              <span className="kob-voyager-card-tap-hint">
                {language === "ar"
                  ? "اضغط للطلب"
                  : "Tap to order"}
              </span>
            )}
          </div>
        </button>

        <div className="kob-voyager-card-face kob-voyager-card-back">
          <button
            type="button"
            onClick={onFlip}
            className="kob-voyager-card-back-button"
            aria-label={
              language === "ar"
                ? "العودة إلى صورة المشروب"
                : "Return to drink image"
            }
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <div className="kob-voyager-back-icon">
            <Coffee className="h-10 w-10" />
          </div>

          <div className="kob-voyager-back-copy">
            <span className="kob-voyager-back-eyebrow">
              {language === "ar"
                ? "اختيارك"
                : "Your selection"}
            </span>

            <h3>{primaryName}</h3>

            <p>{secondaryName}</p>
          </div>

          <button
            type="button"
            disabled={busy || !canOrder}
            onClick={(event) => {
              event.stopPropagation();
              onOrder();
            }}
            className="btn-brass kob-voyager-order-button"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShoppingBag className="h-5 w-5" />
            )}

            <span>
              {language === "ar"
                ? "اطلب الآن"
                : "Order Now"}
            </span>
          </button>

          {!canOrder && (
            <p className="kob-voyager-order-disabled">
              {language === "ar"
                ? "لا يمكنك إرسال طلب جديد الآن"
                : "You cannot place another order right now"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
