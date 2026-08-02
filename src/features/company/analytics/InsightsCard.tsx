import { Sparkles } from "lucide-react";

export function InsightsCard({ insights, isAr }: { insights: string[]; isAr: boolean }) {
  return (
    <section className="an-card an-insights">
      <header>
        <Sparkles className="h-4 w-4" />
        <h3>{isAr ? "رؤى ذكية" : "AI Insights"}</h3>
      </header>
      <ul>
        {insights.map((insight, index) => (
          <li key={index}>{insight}</li>
        ))}
      </ul>
      <p className="an-insights-note">
        {isAr
          ? "تُحسب هذه الرؤى حاليًا من بياناتك مباشرة، وسيتم ربطها بمحرك ذكاء اصطناعي لاحقًا."
          : "These insights are derived from your data today and will connect to an AI engine later."}
      </p>
    </section>
  );
}