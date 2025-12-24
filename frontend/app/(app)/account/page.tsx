"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTier } from "@/hooks/useTier";
import { tiers, tierOrder, formatTierPrice, getNextTier, type TierId } from "@/lib/tiers";
import { useThemePersist } from "@/hooks/useThemePersist";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Check, Crown, Shield, Zap, ArrowRight, Clock, Calendar, Download, Bell } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, signOut } = useAuth();
  const { tier, tierDefinition, queriesUsedToday, queriesRemaining } = useTier();
  const { theme, toggleTheme } = useThemePersist();
  const { locale, setLocale } = useI18n();
  
  const [defaultLocation, setDefaultLocation] = useState("Tel Aviv, Israel");
  const [industry, setIndustry] = useState("Energy");
  const [temperatureUnit, setTemperatureUnit] = useState<"c" | "f">("c");
  const [precipUnit, setPrecipUnit] = useState<"mm" | "in">("mm");
  const [resolution, setResolution] = useState("daily");

  // Check for subscription success
  const subscriptionSuccess = searchParams.get('subscription') === 'success';

  const getTierIcon = (tierId: TierId) => {
    switch (tierId) {
      case 'professional':
        return <Crown className="h-5 w-5 text-purple-500" />;
      case 'enterprise':
        return <Shield className="h-5 w-5 text-amber-500" />;
      case 'standard':
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTierColor = (tierId: TierId) => {
    switch (tierId) {
      case 'professional':
        return 'border-purple-500/30 bg-purple-500/5';
      case 'enterprise':
        return 'border-amber-500/30 bg-amber-500/5';
      case 'standard':
        return 'border-blue-500/30 bg-blue-500/5';
      default:
        return 'border-primary/30 bg-primary/5';
    }
  };

  const nextTier = getNextTier(tier);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Account"
        description="Manage your profile, preferences, and subscription settings."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account" }]}
      />

      {/* Subscription Success Banner */}
      {subscriptionSuccess && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-600">Subscription Updated!</p>
                <p className="text-sm text-muted-foreground">Your {tierDefinition.name} plan is now active.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={userProfile?.email || user?.email || ''} 
                disabled 
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={userProfile?.full_name || ''} 
                placeholder="Enter your name"
              />
            </div>
            <div className="flex gap-3">
              <Button className="rounded-full" onClick={() => toast({ title: "Profile updated" })}>
                Save Changes
              </Button>
              <Button variant="outline" className="rounded-full" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className={`rounded-3xl border ${getTierColor(tier)}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getTierIcon(tier)}
                  {tierDefinition.name} Plan
                </CardTitle>
                <CardDescription>{tierDefinition.description}</CardDescription>
              </div>
              <Badge variant="outline" className={getTierColor(tier)}>
                {tier === 'basic' ? 'Free' : 'Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Usage Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Queries Today</span>
                </div>
                <p className="text-lg font-semibold">
                  {queriesUsedToday} / {tierDefinition.queriesPerDay === 'unlimited' ? '∞' : tierDefinition.queriesPerDay}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Horizon</span>
                </div>
                <p className="text-lg font-semibold">{tierDefinition.horizonDays} days</p>
              </div>
            </div>

            {/* Features */}
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Your Plan Includes:</p>
              <ul className="space-y-1.5">
                {tierDefinition.features.slice(0, 5).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade CTA */}
            {nextTier && (
              <>
                <Separator />
                <div className="rounded-2xl border border-dashed border-border/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Upgrade to {tiers[nextTier].name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTierPrice(nextTier)}/month
                      </p>
                    </div>
                    <Button asChild size="sm" className="rounded-full">
                      <Link href={`/checkout?plan=${nextTier}`}>
                        Upgrade <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Button variant="ghost" className="rounded-full w-full" asChild>
              <Link href="/pricing">View All Plans</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Card */}
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
                <Select value={temperatureUnit} onValueChange={(value) => setTemperatureUnit(value as "c" | "f")}>
                  <SelectTrigger>{temperatureUnit === "c" ? "Celsius" : "Fahrenheit"}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="c">Celsius</SelectItem>
                    <SelectItem value="f">Fahrenheit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precipitation</Label>
                <Select value={precipUnit} onValueChange={(value) => setPrecipUnit(value as "mm" | "in")}>
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

        {/* Theme & Language Card */}
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Theme & Language</CardTitle>
            <CardDescription>Customize your experience.</CardDescription>
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

        {/* Feature Access Card */}
        <Card className="rounded-3xl border border-border/60 bg-background/70 lg:col-span-2">
          <CardHeader>
            <CardTitle>Feature Access</CardTitle>
            <CardDescription>What's available on your {tierDefinition.name} plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-2xl border p-4 ${tierDefinition.gating.probabilistic ? 'border-green-500/30 bg-green-500/5' : 'border-border/60 bg-muted/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {tierDefinition.gating.probabilistic ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="h-5 w-5 text-muted-foreground">✕</span>
                  )}
                  <span className="font-medium">Probabilistic Insights</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tierDefinition.gating.probabilistic ? 'Available' : 'Requires Standard+'}
                </p>
              </div>
              
              <div className={`rounded-2xl border p-4 ${tierDefinition.gating.extremeEvents ? 'border-green-500/30 bg-green-500/5' : 'border-border/60 bg-muted/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {tierDefinition.gating.extremeEvents ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="h-5 w-5 text-muted-foreground">✕</span>
                  )}
                  <span className="font-medium">Extreme Events</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tierDefinition.gating.extremeEvents ? 'Available' : 'Requires Professional+'}
                </p>
              </div>
              
              <div className={`rounded-2xl border p-4 ${tierDefinition.gating.exports.length > 0 ? 'border-green-500/30 bg-green-500/5' : 'border-border/60 bg-muted/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Download className={`h-5 w-5 ${tierDefinition.gating.exports.length > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Exports</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tierDefinition.gating.exports.length > 0 
                    ? tierDefinition.gating.exports.map(e => e.toUpperCase()).join(', ')
                    : 'Requires Professional+'}
                </p>
              </div>
              
              <div className={`rounded-2xl border p-4 ${tierDefinition.gating.alerts.length > 0 ? 'border-green-500/30 bg-green-500/5' : 'border-border/60 bg-muted/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className={`h-5 w-5 ${tierDefinition.gating.alerts.length > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Alerts</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tierDefinition.gating.alerts.length > 0 
                    ? tierDefinition.gating.alerts.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')
                    : 'Requires Professional+'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
