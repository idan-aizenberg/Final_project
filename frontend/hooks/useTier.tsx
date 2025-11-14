"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { TierId } from "@/lib/tiers";
import { tiers } from "@/lib/tiers";

export interface TierContextValue {
  tier: TierId;
  setTier: (tier: TierId) => void;
  queriesUsedToday: number;
  setQueriesUsedToday: (value: number) => void;
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

const STORAGE_KEY = "weathersight:tier";
const ADMIN_KEY = "weathersight:isAdmin";

export function TierProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<TierId>("professional");
  const [queriesUsedToday, setQueriesUsedToday] = useState(0);
  const [isAdmin, setIsAdminState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTier = window.localStorage.getItem(STORAGE_KEY) as TierId | null;
    const storedAdmin = window.localStorage.getItem(ADMIN_KEY);
    if (storedTier && tiers[storedTier]) {
      setTierState(storedTier);
    }
    if (storedAdmin) {
      setIsAdminState(storedAdmin === "true");
    }
  }, []);

  const setTier = (next: TierId) => {
    setTierState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const setIsAdmin = (next: boolean) => {
    setIsAdminState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_KEY, String(next));
    }
  };

  const value = useMemo(
    () => ({
      tier,
      setTier,
      queriesUsedToday,
      setQueriesUsedToday,
      isAdmin,
      setIsAdmin,
    }),
    [tier, queriesUsedToday, isAdmin]
  );

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useTier() {
  const context = useContext(TierContext);
  if (!context) {
    throw new Error("useTier must be used within a TierProvider");
  }
  return context;
}
