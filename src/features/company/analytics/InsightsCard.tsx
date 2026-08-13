import { Sparkles } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { BodySmall, Caption, Card, CardBody, CardHeader } from "@/components/kob";

export function InsightsCard({ insights, isAr }: { insights: string[]; isAr: boolean }) {
  const { t } = useI18n();
  void isAr;
  return (
    <Card>
      <CardHeader title={t("analytics.insights.title")} icon={<Sparkles className="h-4 w-4" />} />
      <CardBody>
        <ul className="an-insights-list list-disc space-y-1 ps-5">
          {insights.map((insight, index) => (
            <li key={index}>
              <BodySmall as="span" tone="muted">
                {insight}
              </BodySmall>
            </li>
          ))}
        </ul>
        <Caption tone="muted" as="p" className="mt-3">
          {t("analytics.insights.note")}
        </Caption>
      </CardBody>
    </Card>
  );
}
