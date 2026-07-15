
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
} from "lucide-react";

import { DrinkCard } from "./DrinkCard";
import type { Drink, DrinkOrderCustomization } from "./types";

type DrinkSliderProps = {
  drinks: Drink[];
  language: "ar" | "en";
  mode: "showcase" | "order";
  busy?: boolean;
  canOrder?: boolean;
  onOrder?: (
    drink: Drink,
    customization: DrinkOrderCustomization,
  ) => void | Promise<void>;
};

const SWIPE_THRESHOLD = 45;

export function DrinkSlider({
  drinks,
  language,
  mode,
  busy = false,
  canOrder = true,
  onOrder,
}: DrinkSliderProps) {
  const [activeIndex, setActiveIndex] =
    useState(0);

  const [flippedDrinkId, setFlippedDrinkId] =
    useState<string | null>(null);

  const pointerStartX =
    useRef<number | null>(null);

  const pointerLastX =
    useRef<number | null>(null);

  useEffect(() => {
    if (
      activeIndex >
      drinks.length - 1
    ) {
      setActiveIndex(0);
    }

    setFlippedDrinkId(null);
  }, [
    activeIndex,
    drinks.length,
  ]);

  const visibleCards = useMemo(() => {
    return drinks.map(
      (
        drink,
        index,
      ) => ({
        drink,
        index,
        position:
          getCircularPosition(
            index,
            activeIndex,
            drinks.length,
          ),
      }),
    );
  }, [
    activeIndex,
    drinks,
  ]);

  function previous() {
    if (
      drinks.length <= 1
    ) {
      return;
    }

    setFlippedDrinkId(null);

    setActiveIndex(
      (current) =>
        current === 0
          ? drinks.length - 1
          : current - 1,
    );
  }

  function next() {
    if (
      drinks.length <= 1
    ) {
      return;
    }

    setFlippedDrinkId(null);

    setActiveIndex(
      (current) =>
        current ===
        drinks.length - 1
          ? 0
          : current + 1,
    );
  }

  function selectCard(
    index: number,
  ) {
    setFlippedDrinkId(null);
    setActiveIndex(index);
  }

  function toggleFlip(
    drinkId: string,
  ) {
    if (
      mode !== "order"
    ) {
      return;
    }

    setFlippedDrinkId(
      (current) =>
        current === drinkId
          ? null
          : drinkId,
    );
  }

  function handlePointerDown(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    pointerStartX.current =
      event.clientX;

    pointerLastX.current =
      event.clientX;

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function handlePointerMove(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      pointerStartX.current ===
      null
    ) {
      return;
    }

    pointerLastX.current =
      event.clientX;
  }

  function handlePointerUp(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      pointerStartX.current ===
        null ||
      pointerLastX.current ===
        null
    ) {
      return;
    }

    const distance =
      pointerStartX.current -
      pointerLastX.current;

    if (
      Math.abs(distance) >=
      SWIPE_THRESHOLD
    ) {
      if (distance > 0) {
        next();
      } else {
        previous();
      }
    }

    pointerStartX.current =
      null;

    pointerLastX.current =
      null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
  }

  if (
    drinks.length === 0
  ) {
    return (
      <div className="kob-voyager-empty">
        <Coffee className="h-12 w-12" />

        <p>
          {language === "ar"
            ? "لا توجد مشروبات متاحة حاليًا"
            : "No drinks are currently available"}
        </p>
      </div>
    );
  }

  return (
    <div className="kob-voyager-slider">
      <div
        className="kob-voyager-stage"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
      >
        {visibleCards.map(
          ({
            drink,
            index,
            position,
          }) => {
            const active =
              position === 0;

            const hidden =
              Math.abs(position) >
              1;

            if (hidden) {
              return null;
            }

            return (
              <DrinkCard
                key={drink.id}
                drink={drink}
                language={
                  language
                }
                position={
                  position
                }
                active={active}
                flipped={
                  flippedDrinkId ===
                  drink.id
                }
                orderMode={
                  mode === "order"
                }
                busy={
                  busy &&
                  active
                }
                canOrder={
                  canOrder
                }
                onSelect={() => {
                  selectCard(
                    index,
                  );
                }}
                onFlip={() => {
                  toggleFlip(
                    drink.id,
                  );
                }}
                onOrder={(customization) => {
                  void onOrder?.(drink, customization);
                }}
              />
            );
          },
        )}

        {drinks.length > 1 && (
          <>
            <button
              type="button"
              onClick={previous}
              className="kob-voyager-arrow kob-voyager-arrow-left"
              aria-label={
                language === "ar"
                  ? "المشروب السابق"
                  : "Previous drink"
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={next}
              className="kob-voyager-arrow kob-voyager-arrow-right"
              aria-label={
                language === "ar"
                  ? "المشروب التالي"
                  : "Next drink"
              }
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="kob-voyager-pagination">
        {drinks.map(
          (
            drink,
            index,
          ) => (
            <button
              key={drink.id}
              type="button"
              onClick={() => {
                selectCard(
                  index,
                );
              }}
              className={
                index ===
                activeIndex
                  ? "kob-voyager-dot kob-voyager-dot-active"
                  : "kob-voyager-dot"
              }
              aria-label={`${index + 1}`}
            />
          ),
        )}
      </div>
    </div>
  );
}

function getCircularPosition(
  index: number,
  activeIndex: number,
  total: number,
) {
  if (
    total <= 1
  ) {
    return index ===
      activeIndex
      ? 0
      : 99;
  }

  let difference =
    index - activeIndex;

  const half =
    Math.floor(total / 2);

  if (
    difference > half
  ) {
    difference -= total;
  }

  if (
    difference < -half
  ) {
    difference += total;
  }

  return difference;
}
