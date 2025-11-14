"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BellDot, Pause, Play, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TierGate } from "@/components/shared/TierGate";
import { EmptyState } from "@/components/shared/EmptyState";
import { createAlert, deleteAlert, fetchAlerts, updateAlert } from "@/lib/api";
import { tiers } from "@/lib/tiers";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";

const alertSchema = z.object({
  name: z.string().min(2, "Name is required"),
  location: z.string().min(2, "Location is required"),
  condition: z.enum(["Heatwave probability", "Frost risk", "Extreme wind risk", "Heavy rain"], {
    required_error: "Select a condition",
  }),
  threshold: z.number().min(10).max(100),
  channel: z.array(z.enum(["email", "sms", "push"])).min(1, "Select at least one channel"),
  frequency: z.enum(["realtime", "daily", "weekly"], { required_error: "Select frequency" }),
  window: z.number().min(3).max(60),
});

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const { tier } = useTier();
  const tierDefinition = tiers[tier];
  const [open, setOpen] = useState(false);

  const allowedChannels = tierDefinition.gating.alerts;

  const alertsQuery = useQuery({ queryKey: ["alerts"], queryFn: fetchAlerts, enabled: tierDefinition.gating.alerts.length > 0 });

  const form = useForm<z.infer<typeof alertSchema>>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      name: "Heatwave watch",
      location: "Tel Aviv",
      condition: "Heatwave probability",
      threshold: 80,
      channel: allowedChannels.slice(0, 1),
      frequency: "daily",
      window: 14,
    },
  });

  const createMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert created", description: "You'll receive notifications as thresholds trigger." });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" }) => updateAlert(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const handleSubmit = (values: z.infer<typeof alertSchema>) => {
    if (allowedChannels.length === 0) return;
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alerts"
        description="Stay ahead of critical thresholds with automated notifications across channels."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Alerts" }]}
        actions={
          tierDefinition.gating.alerts.length > 0 && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> Create alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create alert</DialogTitle>
                  <DialogDescription>Define thresholds and delivery channels to stay ahead of extreme shifts.</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-5"
                  onSubmit={form.handleSubmit((values) =>
                    handleSubmit({
                      ...values,
                      threshold: Number(values.threshold) / 100,
                      window: Number(values.window),
                    })
                  )}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="alert-name">Alert name</Label>
                      <Input id="alert-name" placeholder="Heatwave watch" {...form.register("name")}
                        aria-invalid={Boolean(form.formState.errors.name)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alert-location">Location</Label>
                      <Input id="alert-location" placeholder="Tel Aviv" {...form.register("location")}
                        aria-invalid={Boolean(form.formState.errors.location)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={form.watch("condition")} onValueChange={(value) => form.setValue("condition", value as any)}>
                        <SelectTrigger>{form.watch("condition")}</SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Heatwave probability">Heatwave probability</SelectItem>
                          <SelectItem value="Frost risk">Frost risk</SelectItem>
                          <SelectItem value="Extreme wind risk">Extreme wind risk</SelectItem>
                          <SelectItem value="Heavy rain">Heavy rain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Threshold (%)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min={10}
                        max={100}
                        {...form.register("threshold", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Delivery channels</Label>
                    <div className="flex flex-wrap gap-3">
                      {["email", "sms", "push"].map((channel) => {
                        const disabled = !allowedChannels.includes(channel as any);
                        const checked = form.watch("channel").includes(channel as any);
                        return (
                          <label key={channel} className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-sm">
                            <Checkbox
                              disabled={disabled}
                              checked={checked}
                              onCheckedChange={(value) => {
                                const current = form.watch("channel");
                                if (value) {
                                  form.setValue("channel", [...current, channel as any]);
                                } else {
                                  form.setValue("channel", current.filter((item) => item !== channel));
                                }
                              }}
                            />
                            <span className={disabled ? "text-muted-foreground line-through" : "text-foreground"}>
                              {channel.toUpperCase()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={form.watch("frequency")} onValueChange={(value) => form.setValue("frequency", value as any)}>
                        <SelectTrigger className="capitalize">{form.watch("frequency")}</SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="window">Lookahead window (days)</Label>
                      <Input
                        id="window"
                        type="number"
                        min={3}
                        max={60}
                        {...form.register("window", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full">
                      Cancel
                    </Button>
                    <Button type="submit" className="rounded-full" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating…" : "Create alert"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <TierGate
        allowed={tierDefinition.gating.alerts.length > 0}
        requiredTier="professional"
        reason="Automated alerts are part of the Professional and Enterprise plans."
      >
        {alertsQuery.data && alertsQuery.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {alertsQuery.data.map((alert) => (
              <Card key={alert.id} className="rounded-3xl border border-border/60 bg-background/70 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{alert.name}</h3>
                    <p className="text-sm text-muted-foreground">{alert.location}</p>
                  </div>
                  <Badge variant={alert.status === "active" ? "success" : "warning"}>
                    {alert.status === "active" ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p>
                    Condition: <span className="font-semibold text-foreground">{alert.condition}</span>
                  </p>
                  <p>
                    Threshold: <span className="font-semibold text-foreground">{Math.round(alert.threshold * 100)}%</span>
                  </p>
                  <p>
                    Channels: <span className="font-semibold text-foreground">{alert.channel.join(", ")}</span>
                  </p>
                  <p>
                    Frequency: <span className="font-semibold text-foreground capitalize">{alert.frequency}</span>
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() =>
                      updateMutation.mutate({ id: alert.id, status: alert.status === "active" ? "paused" : "active" })
                    }
                  >
                    {alert.status === "active" ? (
                      <>
                        <Pause className="mr-1 h-4 w-4" aria-hidden /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-4 w-4" aria-hidden /> Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(alert.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" aria-hidden /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No alerts yet"
            description="Create an alert to receive email, SMS, or push notifications when conditions spike." 
            action={{ label: "Create alert", onClick: () => setOpen(true) }}
            className="rounded-3xl"
          />
        )}
      </TierGate>
    </div>
  );
}
