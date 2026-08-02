import { CalendarRange } from "lucide-react";

import type { DateRange, PresetKey } from "./types";

const PRESETS: Array<{ key: PresetKey; ar: string; en: string }> = [
  { key: "today", ar: "اليوم", en: "Today" },
  { key: "yesterday", ar: "أمس", en: "Yesterday" },
  { key: "last7", ar: "آخر ٧ أيام", en: "Last 7 Days" },
  { key: "last30", ar: "آخر ٣٠ يومًا", en: "Last 30 Days" },
  { key: "this_month", ar: "هذا الشهر", en: "This Month" },
  { key: "last_month", ar: "الشهر الماضي", en: "Last Month" },
  { key: "custom", ar: "فترة مخصصة", en: "Custom Range" },
];

export function DateRangeFilter({
  preset,
  range,
  isAr,
  onPreset,
  onRange,
}: {
  preset: PresetKey;
  range: DateRange;
  isAr: boolean;
  onPreset: (preset: PresetKey) => void;
  onRange: (range: DateRange) => void;
}) {
  return (
    <section className="an-card an-range">
      <div className="an-range-head">
        <CalendarRange className="h-4 w-4" />
        <span>{isAr ? "الفترة الزمنية" : "Date range"}</span>
      </div>
      <div className="an-presets" role="group">
        {PRESETS.map((item) => (
          <button
            key={item.key}
            type="button"
            data-active={preset === item.key ? "true" : "false"}
            onClick={() => onPreset(item.key)}
          >
            {isAr ? item.ar : item.en}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="an-range-inputs">
          <label>
            <span>{isAr ? "من" : "From"}</span>
            <input
              className="cs-input"
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => onRange({ ...range, from: event.target.value })}
            />
          </label>
          <label>
            <span>{isAr ? "إلى" : "To"}</span>
            <input
              className="cs-input"
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => onRange({ ...range, to: event.target.value })}
            />
          </label>
        </div>
      ) : (
        <p className="an-range-hint">
          {range.from} — {range.to}
        </p>
      )}
    </section>
  );
}