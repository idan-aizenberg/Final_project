import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartPanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartPanel({ title, description, actions, footer, children, className }: ChartPanelProps) {
  return (
    <Card className={cn("glass-panel relative min-h-[320px]", className)}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="relative flex flex-1 flex-col gap-4">
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0 rounded-3xl border border-border/40" aria-hidden />
          <div className="relative h-full w-full p-4 sm:p-6">{children}</div>
        </div>
        {footer && <div className="rounded-2xl bg-muted/40 p-4 text-xs text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}
