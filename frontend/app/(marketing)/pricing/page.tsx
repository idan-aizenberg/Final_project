import Link from "next/link";
import { Check, Minus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tiers, tierOrder, type TierId, formatTierPrice } from "@/lib/tiers";

const featureMatrix = [
  { 
    label: "Queries per day", 
    render: (tier: TierId) => (tiers[tier].queriesPerDay === "unlimited" ? "Unlimited" : `${tiers[tier].queriesPerDay}`) 
  },
  { 
    label: "Forecast horizon", 
    render: (tier: TierId) => `${tiers[tier].horizonDays} days` 
  },
  { 
    label: "Saved locations", 
    render: (tier: TierId) => (tiers[tier].gating.maxLocations === "unlimited" ? "Unlimited" : `${tiers[tier].gating.maxLocations}`) 
  },
  { 
    label: "Probabilistic insights", 
    render: (tier: TierId) => tiers[tier].gating.probabilistic 
  },
  { 
    label: "Extreme event scouting", 
    render: (tier: TierId) => tiers[tier].gating.extremeEvents 
  },
  { 
    label: "Exports", 
    render: (tier: TierId) => tiers[tier].gating.exports.length > 0 ? tiers[tier].gating.exports.map(e => e.toUpperCase()).join(", ") : false 
  },
  { 
    label: "Alert channels", 
    render: (tier: TierId) => tiers[tier].gating.alerts.length > 0 ? tiers[tier].gating.alerts.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(", ") : false 
  },
  { 
    label: "Industry dashboards", 
    render: (tier: TierId) => tiers[tier].gating.dashboards === "all" ? "All industries" : tiers[tier].gating.dashboards === 0 ? false : `${tiers[tier].gating.dashboards}` 
  },
  { 
    label: "API access", 
    render: (tier: TierId) => tiers[tier].gating.apiAccess 
  },
  { 
    label: "Priority support", 
    render: (tier: TierId) => tiers[tier].gating.prioritySupport 
  },
];

const popularTier = "standard";

export default function PricingPage() {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl space-y-4">
        <Badge variant="outline" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
          Choose the intelligence your operations need.
        </h1>
        <p className="text-lg text-muted-foreground">
          WeatherSight tiers align to the depth of probabilistic insight, extreme event coverage, and automation your teams
          require. Upgrade any time as your climate exposure evolves.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {tierOrder.map((id) => {
          const tier = tiers[id];
          const isPopular = id === popularTier;
          const isEnterprise = id === "enterprise";
          
          return (
            <Card 
              key={tier.id} 
              className={`flex flex-col rounded-3xl border p-6 transition-all duration-200 ${
                isPopular 
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]" 
                  : "border-border/60 bg-background/80 hover:border-border"
              }`}
            >
              <CardHeader className="space-y-4 p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground">{tier.name}</CardTitle>
                    <CardDescription className="mt-1">{tier.description}</CardDescription>
                  </div>
                  {isPopular && (
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="mr-1 h-3 w-3" /> Popular
                    </Badge>
                  )}
                </div>
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-foreground">
                      {formatTierPrice(id)}
                    </span>
                    {!isEnterprise && tier.pricing.monthly > 0 && (
                      <span className="text-sm text-muted-foreground">/month</span>
                    )}
                  </div>
                  {tier.pricing.yearly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      or {formatTierPrice(id, "yearly")}/year (save 17%)
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-0 pt-6">
                <ul className="space-y-2.5 text-sm text-muted-foreground flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className={`mt-auto rounded-full ${isPopular ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                  variant={isPopular ? "default" : "secondary"}
                >
                  <Link href={isEnterprise ? "mailto:sales@weathersight.ai" : `/checkout?plan=${id}`}>
                    {isEnterprise ? "Contact sales" : tier.pricing.monthly === 0 ? "Get started free" : "Start now"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 overflow-x-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-6">Feature comparison</h2>
        <div className="min-w-[640px]">
          <div className="grid gap-4">
            {/* Header row */}
            <div 
              className="grid items-center gap-4 pb-4 border-b border-border/60 text-sm font-semibold" 
              style={{ gridTemplateColumns: "minmax(180px, 1fr) repeat(4, minmax(120px, 1fr))" }}
            >
              <span>Feature</span>
              {tierOrder.map((id) => (
                <span key={id} className={`text-center ${id === popularTier ? "text-primary" : "text-foreground"}`}>
                  {tiers[id].name}
                  {id === popularTier && <Badge className="ml-2 text-xs">Popular</Badge>}
                </span>
              ))}
            </div>
            
            {/* Feature rows */}
            {featureMatrix.map((row) => (
              <div 
                key={row.label} 
                className="grid items-center gap-4 border-b border-border/40 pb-4 text-sm text-muted-foreground last:border-b-0 last:pb-0" 
                style={{ gridTemplateColumns: "minmax(180px, 1fr) repeat(4, minmax(120px, 1fr))" }}
              >
                <span className="font-medium text-foreground">{row.label}</span>
                {tierOrder.map((id) => {
                  const value = row.render(id);
                  return (
                    <span key={id} className="flex items-center justify-center gap-2">
                      {typeof value === "boolean" ? (
                        value ? (
                          <Check className="h-5 w-5 text-emerald-500" aria-hidden />
                        ) : (
                          <Minus className="h-5 w-5 text-muted-foreground/50" aria-hidden />
                        )
                      ) : (
                        <span className="text-foreground text-center">{value}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-foreground">Frequently asked questions</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-border/60 bg-background/80 p-6">
            <h3 className="font-semibold text-foreground mb-2">Can I change plans anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.
            </p>
          </Card>
          <Card className="rounded-3xl border border-border/60 bg-background/80 p-6">
            <h3 className="font-semibold text-foreground mb-2">What happens if I exceed my query limit?</h3>
            <p className="text-sm text-muted-foreground">
              You'll be notified when approaching your daily limit. Once reached, you can wait for the midnight reset or upgrade your plan for more queries.
            </p>
          </Card>
          <Card className="rounded-3xl border border-border/60 bg-background/80 p-6">
            <h3 className="font-semibold text-foreground mb-2">Is there a free trial for paid plans?</h3>
            <p className="text-sm text-muted-foreground">
              The Basic plan is free forever. For paid plans, we offer a 14-day money-back guarantee if you're not satisfied with the service.
            </p>
          </Card>
          <Card className="rounded-3xl border border-border/60 bg-background/80 p-6">
            <h3 className="font-semibold text-foreground mb-2">How does Enterprise pricing work?</h3>
            <p className="text-sm text-muted-foreground">
              Enterprise pricing is customized based on your organization's needs, including API volume, custom integrations, and support requirements. Contact our sales team for a quote.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
