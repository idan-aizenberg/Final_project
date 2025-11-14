import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeeklyCardProps {
  weekLabel: string;
  narrative: string;
  riskLevel: "low" | "medium" | "high";
  meta?: ReactNode;
}

const riskStyles: Record<WeeklyCardProps["riskLevel"], string> = {
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  high: "border-rose-500/40 bg-rose-500/10 text-rose-600",
};

export function WeeklyCard({ weekLabel, narrative, riskLevel, meta }: WeeklyCardProps) {
  return (
    <Card className="flex h-full flex-col gap-4 rounded-3xl border border-border/50 bg-background/70 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Week of</p>
          <p className="text-base font-semibold text-foreground">{weekLabel}</p>
        </div>
        <Badge className={cn("border text-xs font-semibold", riskStyles[riskLevel])} variant="outline">
          {riskLevel === "low" && "Low risk"}
          {riskLevel === "medium" && "Watch"}
          {riskLevel === "high" && "High alert"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{narrative}</p>
      {meta && <div className="mt-auto text-xs text-muted-foreground/80">{meta}</div>}
    </Card>
  );
}
