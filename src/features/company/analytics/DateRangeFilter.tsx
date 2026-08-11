import { CalendarRange } from "lucide-react";

import { Button, Card, CardBody, CardHeader, DateRangeInput } from "@/components/kob";
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
    <Card>
      <CardHeader title={isAr ? "الفترة الزمنية" : "Date range"} icon={<CalendarRange className="h-4 w-4" />} />
      <CardBody>
        <div className="flex flex-wrap gap-2" role="group">
          {PRESETS.map((item) => (
            <Button
              key={item.key}
              variant={preset === item.key ? "primary" : "secondary"}
              size="sm"
              onClick={() => onPreset(item.key)}
            >
              {isAr ? item.ar : item.en}
            </Button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="mt-3">
            <DateRangeInput
              fromLabel={isAr ? "من" : "From"}
              toLabel={isAr ? "إلى" : "To"}
              from={range.from}
              to={range.to}
              onFromChange={(from) => onRange({ ...range, from })}
              onToChange={(to) => onRange({ ...range, to })}
            />
          </div>
        ) : (
          <p className="an-range-hint mt-3 text-sm opacity-70">
            {range.from} — {range.to}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
