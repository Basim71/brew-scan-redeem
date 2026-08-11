import { Sparkles } from "lucide-react";

import { Card, CardBody, CardHeader } from "@/components/kob";

export function InsightsCard({ insights, isAr }: { insights: string[]; isAr: boolean }) {
  return (
    <Card>
      <CardHeader title={isAr ? "رؤى ذكية" : "AI Insights"} icon={<Sparkles className="h-4 w-4" />} />
      <CardBody>
        <ul className="an-insights-list list-disc space-y-1 ps-5 text-sm text-[var(--kob-ink-muted,inherit)]">
          {insights.map((insight, index) => (
            <li key={index}>{insight}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs opacity-70">
          {isAr
            ? "تُحسب هذه الرؤى حاليًا من بياناتك مباشرة، وسيتم ربطها بمحرك ذكاء اصطناعي لاحقًا."
            : "These insights are derived from your data today and will connect to an AI engine later."}
        </p>
      </CardBody>
    </Card>
  );
}
