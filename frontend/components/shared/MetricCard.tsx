import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  primaryValue: string;
  deltaLabel?: string;
  deltaValue?: string;
  trend?: "up" | "down" | "steady";
  footer?: string;
  icon?: React.ReactNode;
  className?: string;
}

const trendCopy: Record<NonNullable<MetricCardProps["trend"]>, string> = {
  up: "text-emerald-500",
  down: "text-rose-500",
  steady: "text-muted-foreground",
};

export function MetricCard({ label, primaryValue, deltaLabel, deltaValue, trend = "steady", footer, icon, className }: MetricCardProps) {
  return (
    <Card className={cn("flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-background/80 p-6", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-semibold text-foreground">{primaryValue}</p>
        {deltaValue && deltaLabel && (
          <p className={cn("text-xs font-medium", trendCopy[trend])}>
            {deltaLabel} • {deltaValue}
          </p>
        )}
      </div>
      {footer && <p className="mt-auto text-xs text-muted-foreground">{footer}</p>}
    </Card>
  );
}
