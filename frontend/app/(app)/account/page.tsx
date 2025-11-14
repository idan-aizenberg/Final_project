"use client";

import { useState } from "react";
import { useTier } from "@/hooks/useTier";
import { tiers, tierOrder } from "@/lib/tiers";
import { useThemePersist } from "@/hooks/useThemePersist";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function AccountPage() {
  const { tier, setTier } = useTier();
  const { theme, toggleTheme } = useThemePersist();
  const { locale, setLocale } = useI18n();
  const [defaultLocation, setDefaultLocation] = useState("Tel Aviv, Israel");
  const [industry, setIndustry] = useState("Energy");
  const [temperatureUnit, setTemperatureUnit] = useState<"c" | "f">("c");
  const [precipUnit, setPrecipUnit] = useState<"mm" | "in">("mm");
  const [resolution, setResolution] = useState("daily");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Account"
        description="Manage login preferences, defaults, and plan settings."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Placeholder auth controls until SSO and passwordless are wired.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" defaultValue="planner@weathersight.ai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button className="rounded-full" onClick={() => toast({ title: "Settings saved" })}>
              Update credentials
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Defaults used to pre-fill the query wizard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-location">Default location</Label>
              <Input
                id="default-location"
                value={defaultLocation}
                onChange={(event) => setDefaultLocation(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry focus</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>{industry}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Agriculture">Agriculture</SelectItem>
                  <SelectItem value="Logistics">Logistics</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Select value={temperatureUnit} onValueChange={(value) => setTemperatureUnit(value as "c" | "f")}
                >
                  <SelectTrigger>{temperatureUnit === "c" ? "Celsius" : "Fahrenheit"}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="c">Celsius</SelectItem>
                    <SelectItem value="f">Fahrenheit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precipitation</Label>
                <Select value={precipUnit} onValueChange={(value) => setPrecipUnit(value as "mm" | "in")}
                >
                  <SelectTrigger>{precipUnit === "mm" ? "Millimeters" : "Inches"}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm">Millimeters</SelectItem>
                    <SelectItem value="in">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="capitalize">{resolution}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="rounded-full" onClick={() => toast({ title: "Preferences updated" })}>
              Save preferences
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Theme & language</CardTitle>
            <CardDescription>Accessible defaults with quick toggles for dark mode and localisation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Dark mode</p>
                <p className="text-xs text-muted-foreground">Persisted per device.</p>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={locale} onValueChange={(value) => setLocale(value as any)}>
                <SelectTrigger className="uppercase">{locale}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Switch tiers to unlock additional intelligence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current tier</Label>
              <Select value={tier} onValueChange={(value) => setTier(value as any)}>
                <SelectTrigger className="capitalize">{tiers[tier].name}</SelectTrigger>
                <SelectContent>
                  {tierOrder.map((id) => (
                    <SelectItem key={id} value={id}>
                      {tiers[id].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {tiers[tier].features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary/70" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="rounded-full" onClick={() => toast({ title: "Billing portal opening" })}>
              Manage billing
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
