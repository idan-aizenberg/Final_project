import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tiers, tierOrder } from "@/lib/tiers";

const featureMatrix = [
  { label: "Queries per day", render: (tier: string) => (tiers[tier].queriesPerDay === "unlimited" ? "Unlimited" : `${tiers[tier].queriesPerDay}`) },
  { label: "Forecast horizon", render: (tier: string) => `${tiers[tier].horizonDays} days` },
  { label: "Probabilistic insights", render: (tier: string) => tiers[tier].gating.probabilistic },
  { label: "Extreme event scouting", render: (tier: string) => tiers[tier].gating.extremeEvents },
  { label: "Exports", render: (tier: string) => tiers[tier].gating.exports.length > 0 ? tiers[tier].gating.exports.join(", ") : false },
  { label: "Alert channels", render: (tier: string) => tiers[tier].gating.alerts.length > 0 ? tiers[tier].gating.alerts.join(", ") : false },
  { label: "Dashboards", render: (tier: string) => tiers[tier].gating.dashboards === "all" ? "All industries" : tiers[tier].gating.dashboards === 0 ? false : `${tiers[tier].gating.dashboards}` },
];

const tierPrices: Record<string, string> = {
  basic: "$0",
  standard: "$89",
  professional: "$249",
  enterprise: "Let's talk",
};

export default function PricingPage() {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">Choose the intelligence your operations need.</h1>
        <p className="text-lg text-muted-foreground">
          WeatherSight tiers align to the depth of probabilistic insight, extreme event coverage, and automation your teams
          require. Upgrade any time as your climate exposure evolves.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {tierOrder.map((id) => {
          const tier = tiers[id];
          return (
            <Card key={tier.id} className="flex flex-col rounded-3xl border border-border/60 bg-background/80 p-6">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-foreground">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </div>
                <div className="text-3xl font-semibold text-foreground">{tierPrices[id]}</div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-auto rounded-full">
                  <Link href={id === "enterprise" ? "mailto:sales@weathersight.ai" : "/search"}>
                    {id === "enterprise" ? "Contact sales" : "Start now"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/80 p-6">
        <h2 className="text-2xl font-semibold text-foreground">Feature matrix</h2>
        <div className="mt-6 grid gap-4">
          {featureMatrix.map((row) => (
            <div key={row.label} className="grid items-center gap-4 border-b border-border/40 pb-4 text-sm text-muted-foreground last:border-b-0 last:pb-0" style={{ gridTemplateColumns: "minmax(160px, 1fr) repeat(4, minmax(0, 1fr))" }}>
              <span className="font-medium text-foreground">{row.label}</span>
              {tierOrder.map((id) => {
                const value = row.render(id);
                return (
                  <span key={id} className="flex items-center gap-2">
                    {typeof value === "boolean" ? (
                      value ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <span className="text-foreground">{value}</span>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
