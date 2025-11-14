"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { fetchUsage } from "@/lib/api";
import { tierOrder, tiers } from "@/lib/tiers";
import { useTier } from "@/hooks/useTier";

export default function AdminConsolePage() {
  const { isAdmin, setIsAdmin } = useTier();
  const usage = useQuery({ queryKey: ["usage"], queryFn: fetchUsage, enabled: isAdmin });

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin console locked"
        description="Only WeatherSight administrators can access usage metrics and tier definitions."
        action={{ label: "Grant access", onClick: () => setIsAdmin(true) }}
        className="rounded-3xl"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin console"
        description="Monitor tenant usage, adjust tier entitlements, and review recent audit logs."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Total queries today</CardTitle>
            <CardDescription>Across all organizations</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {usage.data ? usage.data.usedToday + 132 : "—"}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Active alerts</CardTitle>
            <CardDescription>Real-time notification streams</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">42</CardContent>
        </Card>
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Enterprise tenants</CardTitle>
            <CardDescription>With dedicated SLA</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">9</CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/70 p-6">
        <h2 className="text-lg font-semibold text-foreground">Tier definitions</h2>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Queries/day</TableHead>
              <TableHead>Horizon</TableHead>
              <TableHead>Exports</TableHead>
              <TableHead>Alerts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tierOrder.map((id) => (
              <TableRow key={id}>
                <TableCell className="font-medium">{tiers[id].name}</TableCell>
                <TableCell>{tiers[id].queriesPerDay === "unlimited" ? "∞" : tiers[id].queriesPerDay}</TableCell>
                <TableCell>{tiers[id].horizonDays} days</TableCell>
                <TableCell>{tiers[id].gating.exports.length > 0 ? tiers[id].gating.exports.join(", ") : "None"}</TableCell>
                <TableCell>{tiers[id].gating.alerts.length > 0 ? tiers[id].gating.alerts.join(", ") : "None"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="ghost" className="mt-4 rounded-full">Edit tiers</Button>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/70 p-6">
        <h2 className="text-lg font-semibold text-foreground">Audit trail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Integration with event streaming is pending. Logs will surface API calls, alert updates, and configuration changes.
        </p>
      </section>
    </div>
  );
}
