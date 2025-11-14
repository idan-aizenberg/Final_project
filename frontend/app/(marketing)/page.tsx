import Link from "next/link";
import { ArrowRight, BarChart3, Compass, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Choice",
    description: "Blend ensemble models, choose resolutions from daily to monthly, and tailor outputs for each industry dashboard.",
    icon: Compass,
  },
  {
    title: "Clarity",
    description: "Visualize uncertainty with confidence intervals, percentile bands, and scenario narratives you can explain to stakeholders.",
    icon: BarChart3,
  },
  {
    title: "Confidence",
    description: "Trigger alerts before operations are impacted. From frost risk to heatwave watch, WeatherSight secures your decisions.",
    icon: ShieldCheck,
  },
];

const steps = [
  {
    title: "Define your forecast",
    description: "Select location, horizon, and risk presets. Query cost updates in real time, so you stay within tier limits.",
  },
  {
    title: "Compare scenarios",
    description: "Explore probabilistic outcomes, extreme event scouting, and exports tailored to teams across your organization.",
  },
  {
    title: "Act with assurance",
    description: "Automate alerts, share dashboards, and keep climate-critical workflows ahead of disruptive weather.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            Probabilistic weather intelligence for climate-sensitive operations
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Know the weather before it changes your plans.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            WeatherSight fuses probabilistic models, industry presets, and alert automation so planners, analysts, and
            operators can act with confidence under climate volatility.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6 py-3 text-base">
              <Link href="/search" className="flex items-center gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="rounded-full px-6 py-3 text-base">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Industry dashboards</dt>
              <dd className="text-2xl font-semibold text-foreground">6+</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Real-time alerts</dt>
              <dd className="text-2xl font-semibold text-foreground">Sub 5 min</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Global coverage</dt>
              <dd className="text-2xl font-semibold text-foreground">195 regions</dd>
            </div>
          </dl>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-sky-200/30 via-slate-200/20 to-purple-200/30 blur-3xl dark:from-sky-900/30 dark:via-slate-900/30 dark:to-violet-900/30" aria-hidden />
          <Card className="rounded-3xl border-0 bg-background/80 p-6 shadow-[var(--elevation-medium)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-foreground">Mission-critical visibility</CardTitle>
              <CardDescription className="text-sm">
                Trusted by energy, agritech, aviation, and logistics teams who need decisive climate intelligence.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
                <Compass className="h-5 w-5 text-primary" aria-hidden />
                Scenario exploration with percentile bands and interactive map overlays.
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden />
                Automated alerts across email, SMS, and push when thresholds breach.
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
                <BarChart3 className="h-5 w-5 text-amber-500" aria-hidden />
                Export-ready insight packets for operations briefings and investor updates.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-10">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Three pillars of WeatherSight</h2>
          <p className="text-muted-foreground">Designed to translate raw forecast ensembles into decisions you can trust.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="rounded-3xl border border-border/60 bg-background/80 p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">How it works</h2>
          <p className="text-muted-foreground">From query to action in three intuitive steps.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="rounded-3xl border border-border/60 bg-background/80 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-sm font-semibold">0{index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
