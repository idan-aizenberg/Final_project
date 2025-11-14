"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TierId } from "@/lib/tiers";
import { useTier } from "@/hooks/useTier";

interface TierGateProps {
  allowed: boolean;
  requiredTier: TierId;
  children: ReactNode;
  reason?: string;
  className?: string;
}

const tierCopy: Record<TierId, string> = {
  basic: "Basic",
  standard: "Standard",
  professional: "Professional",
  enterprise: "Enterprise",
};

export function TierGate({ allowed, requiredTier, children, reason, className }: TierGateProps) {
  const { tier } = useTier();

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-dashed border-border/80", className)}>
      <div className="pointer-events-none absolute inset-0 z-10 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-20 flex flex-col items-center gap-3 p-6 text-center">
        <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Upgrade to {tierCopy[requiredTier]} to unlock this feature
          </p>
          <p className="text-xs text-muted-foreground">
            {reason ?? "Your current plan has limited access to this capability."}
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full">
          <Link href="/pricing">Explore plans</Link>
        </Button>
      </div>
      <div aria-hidden className="opacity-30">
        {children}
      </div>
    </div>
  );
}
