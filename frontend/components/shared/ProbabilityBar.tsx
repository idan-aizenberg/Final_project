import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  label: string;
  probability: number;
  lower: number;
  upper: number;
}

export function ProbabilityBar({ label, probability, lower, upper }: ProbabilityBarProps) {
  const lowerPercent = Math.round(lower * 100);
  const upperPercent = Math.round(upper * 100);
  const centerPercent = Math.round(probability * 100);

  return (
    <div className="space-y-2 rounded-3xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-semibold text-primary">{formatPercent(probability, 0)}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 bg-primary/15"
          style={{ left: `${lowerPercent}%`, right: `${100 - upperPercent}%` }}
          aria-hidden
        />
        <div className="absolute inset-y-0 left-0 bg-primary/35" style={{ width: `${centerPercent}%` }} aria-hidden />
        <span className="absolute -top-6 right-0 text-xs text-muted-foreground">{upperPercent}%</span>
        <span className="absolute -top-6 left-0 text-xs text-muted-foreground">{lowerPercent}%</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatPercent(lower, 0)} – {formatPercent(upper, 0)} confidence interval
      </p>
    </div>
  );
}
