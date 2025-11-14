import type { ReactNode } from "react";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const Icon = icon;

  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-muted/40 p-10 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {Icon ? Icon : <Compass className="h-6 w-6" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action && (
        action.href ? (
          <Button asChild className="rounded-full">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button onClick={action.onClick} className="rounded-full">
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
