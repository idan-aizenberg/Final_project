"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { TierId } from "@/lib/tiers";
import { tiers } from "@/lib/tiers";
import { useAuth } from "@/context/AuthContext";

export interface TierContextValue {
  tier: TierId;
  tierDefinition: typeof tiers[TierId];
  queriesUsedToday: number;
  setQueriesUsedToday: (value: number) => void;
  incrementQueryUsage: () => void;
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  canPerformQuery: () => boolean;
  queriesRemaining: number | "unlimited";
  canAccessFeature: (feature: keyof typeof tiers[TierId]["gating"]) => boolean;
  canExport: (format: "csv" | "pdf" | "excel") => boolean;
  canUseAlertChannel: (channel: "email" | "sms" | "push") => boolean;
  maxHorizonDays: number;
  savedSearchLimit: number | "unlimited";
  canSaveSearch: (currentCount: number) => boolean;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

const ADMIN_KEY = "weathersight:isAdmin";
const USAGE_KEY = "weathersight:queriesUsedToday";
const USAGE_DATE_KEY = "weathersight:usageDate";

export function TierProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  
  // Get tier from authenticated user, fallback to basic
  const tier: TierId = userProfile?.subscription_tier || "basic";
  const tierDefinition = tiers[tier];
  
  const [queriesUsedToday, setQueriesUsedTodayState] = useState(0);
  const [isAdmin, setIsAdminState] = useState(false);

  // Load usage and admin state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if we need to reset usage (new day)
    const storedDate = window.localStorage.getItem(USAGE_DATE_KEY);
    const today = new Date().toDateString();
    
    if (storedDate !== today) {
      // New day - reset usage
      window.localStorage.setItem(USAGE_DATE_KEY, today);
      window.localStorage.setItem(USAGE_KEY, "0");
      setQueriesUsedTodayState(0);
    } else {
      // Same day - load stored usage
      const storedUsage = window.localStorage.getItem(USAGE_KEY);
      if (storedUsage) {
        setQueriesUsedTodayState(parseInt(storedUsage, 10));
      }
    }
    
    // Load admin state
    const storedAdmin = window.localStorage.getItem(ADMIN_KEY);
    if (storedAdmin) {
      setIsAdminState(storedAdmin === "true");
    }
  }, []);

  const setQueriesUsedToday = (value: number) => {
    setQueriesUsedTodayState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USAGE_KEY, String(value));
    }
  };

  const incrementQueryUsage = () => {
    const newValue = queriesUsedToday + 1;
    setQueriesUsedToday(newValue);
  };

  const setIsAdmin = (next: boolean) => {
    setIsAdminState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_KEY, String(next));
    }
  };

  // Helper functions for tier-based checks
  const canPerformQuery = (): boolean => {
    if (tierDefinition.queriesPerDay === "unlimited") return true;
    return queriesUsedToday < tierDefinition.queriesPerDay;
  };

  const queriesRemaining = useMemo(() => {
    if (tierDefinition.queriesPerDay === "unlimited") return "unlimited";
    return Math.max(0, tierDefinition.queriesPerDay - queriesUsedToday);
  }, [tierDefinition.queriesPerDay, queriesUsedToday]);

  const canAccessFeature = (feature: keyof typeof tierDefinition.gating): boolean => {
    const value = tierDefinition.gating[feature];
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    if (value === "all") return true;
    if (typeof value === "number") return value > 0;
    return false;
  };

  const canExport = (format: "csv" | "pdf" | "excel"): boolean => {
    return tierDefinition.gating.exports.includes(format);
  };

  const canUseAlertChannel = (channel: "email" | "sms" | "push"): boolean => {
    return tierDefinition.gating.alerts.includes(channel);
  };

  const maxHorizonDays = tierDefinition.horizonDays;

  const savedSearchLimit = tierDefinition.gating.maxLocations;

  const canSaveSearch = (currentCount: number): boolean => {
    if (savedSearchLimit === "unlimited") return true;
    return currentCount < savedSearchLimit;
  };

  const value = useMemo(
    () => ({
      tier,
      tierDefinition,
      queriesUsedToday,
      setQueriesUsedToday,
      incrementQueryUsage,
      isAdmin,
      setIsAdmin,
      canPerformQuery,
      queriesRemaining,
      canAccessFeature,
      canExport,
      canUseAlertChannel,
      maxHorizonDays,
      savedSearchLimit,
      canSaveSearch,
    }),
    [tier, tierDefinition, queriesUsedToday, isAdmin]
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
