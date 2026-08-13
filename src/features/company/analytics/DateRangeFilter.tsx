import { CalendarRange } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button, Card, CardBody, CardHeader, Caption, DateRangeInput } from "@/components/kob";
import type { DateRange, PresetKey } from "./types";

const PRESETS: Array<{ key: PresetKey }> = [
  { key: "today" },
  { key: "yesterday" },
  { key: "last7" },
  { key: "last30" },
  { key: "this_month" },
  { key: "last_month" },
  { key: "custom" },
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
  const { t } = useI18n();
  void isAr;
  return (
    <Card>
      <CardHeader title={t("analytics.dateRange.title")} icon={<CalendarRange className="h-4 w-4" />} />
      <CardBody>
        <div className="flex flex-wrap gap-2" role="group">
          {PRESETS.map((item) => (
            <Button
              key={item.key}
              variant={preset === item.key ? "primary" : "secondary"}
              size="sm"
              onClick={() => onPreset(item.key)}
            >
              {t(`analytics.dateRange.presets.${item.key}`)}
            </Button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="mt-3">
            <DateRangeInput
              fromLabel={t("analytics.dateRange.from")}
              toLabel={t("analytics.dateRange.to")}
              from={range.from}
              to={range.to}
              onFromChange={(from) => onRange({ ...range, from })}
              onToChange={(to) => onRange({ ...range, to })}
            />
          </div>
        ) : (
          <Caption tone="muted" as="p" className="an-range-hint mt-3">
            {range.from} — {range.to}
          </Caption>
        )}
      </CardBody>
    </Card>
  );
}
