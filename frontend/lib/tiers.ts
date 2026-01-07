export type TierId = "basic" | "standard" | "professional" | "enterprise";

export interface TierDefinition {
  id: TierId;
  name: string;
  description: string;
  queriesPerDay: number | "unlimited";
  horizonDays: number;
  features: string[];
  gating: {
    /** Core metrics: temperature, precipitation - always available */
    coreMetrics: boolean;
    /** Extended metrics: humidity, wind, solar radiation */
    extendedMetrics: boolean;
    /** Single-model probabilistic trends */
    probabilisticBasic: boolean;
    /** Multi-model blending and comparison */
    probabilisticAdvanced: boolean;
    /** Moderate-risk extreme weather */
    extremeEventsModerate: boolean;
    /** High-risk real-time extreme weather */
    extremeEventsRealtime: boolean;
    exports: Array<"csv" | "pdf" | "excel">;
    alerts: Array<"email" | "sms" | "push">;
    dashboards: number | "all";
    maxLocations: number | "unlimited";
    apiAccess: boolean;
    prioritySupport: boolean;
    priorityProcessing: boolean;
  };
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
}

export const tiers: Record<TierId, TierDefinition> = {
  basic: {
    id: "basic",
    name: "Basic",
    description: "Free tier for quick weather checks.",
    queriesPerDay: 3,
    horizonDays: 14,
    features: [
      "3 queries per day",
      "14-day forecast horizon",
      "Temperature & precipitation only",
      "Single location",
      "Community support",
    ],
    gating: {
      coreMetrics: true,
      extendedMetrics: false,
      probabilisticBasic: false,
      probabilisticAdvanced: false,
      extremeEventsModerate: false,
      extremeEventsRealtime: false,
      exports: [],
      alerts: [],
      dashboards: 0,
      maxLocations: 1,
      apiAccess: false,
      prioritySupport: false,
      priorityProcessing: false,
    },
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: "USD",
    },
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "For operational weather tracking with extended metrics.",
    queriesPerDay: 10,
    horizonDays: 30,
    features: [
      "10 queries per day",
      "30-day forecast horizon",
      "Humidity, wind & solar radiation",
      "Single-model probabilities",
      "Up to 5 saved locations",
      "Email support",
    ],
    gating: {
      coreMetrics: true,
      extendedMetrics: true,
      probabilisticBasic: true,
      probabilisticAdvanced: false,
      extremeEventsModerate: false,
      extremeEventsRealtime: false,
      exports: [],
      alerts: [],
      dashboards: 0,
      maxLocations: 5,
      apiAccess: false,
      prioritySupport: false,
      priorityProcessing: false,
    },
    pricing: {
      monthly: 89,
      yearly: 890,
      currency: "USD",
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "Advanced planning with exports, alerts, and probabilistic insights.",
    queriesPerDay: 100,
    horizonDays: 180,
    features: [
      "100 queries per day",
      "180-day forecast horizon",
      "Visual confidence intervals",
      "Moderate-risk extreme weather",
      "CSV, PDF & Excel exports",
      "Email alerts",
      "1 industry dashboard",
      "Up to 25 saved locations",
      "Priority support",
    ],
    gating: {
      coreMetrics: true,
      extendedMetrics: true,
      probabilisticBasic: true,
      probabilisticAdvanced: true,
      extremeEventsModerate: true,
      extremeEventsRealtime: false,
      exports: ["csv", "pdf", "excel"],
      alerts: ["email"],
      dashboards: 1,
      maxLocations: 25,
      apiAccess: false,
      prioritySupport: true,
      priorityProcessing: false,
    },
    pricing: {
      monthly: 249,
      yearly: 2490,
      currency: "USD",
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Mission-critical operations with real-time alerts and API access.",
    queriesPerDay: "unlimited",
    horizonDays: 365,
    features: [
      "Unlimited queries",
      "365-day forecast horizon",
      "Multi-model blending",
      "Real-time high-risk alerts",
      "SMS, Email & Push notifications",
      "All industry dashboards",
      "API integration",
      "Priority processing (QoS)",
      "Unlimited saved locations",
      "24/7 dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    gating: {
      coreMetrics: true,
      extendedMetrics: true,
      probabilisticBasic: true,
      probabilisticAdvanced: true,
      extremeEventsModerate: true,
      extremeEventsRealtime: true,
      exports: ["csv", "pdf", "excel"],
      alerts: ["email", "sms", "push"],
      dashboards: "all",
      maxLocations: "unlimited",
      apiAccess: true,
      prioritySupport: true,
      priorityProcessing: true,
    },
    pricing: {
      monthly: 0, // Contact sales
      yearly: 0,
      currency: "USD",
    },
  },
};

export const tierOrder: TierId[] = ["basic", "standard", "professional", "enterprise"];

export function getTierById(id: TierId): TierDefinition {
  return tiers[id];
}

export function canAccessExtendedMetrics(tier: TierId): boolean {
  return tiers[tier].gating.extendedMetrics;
}

export function canAccessProbabilisticBasic(tier: TierId): boolean {
  return tiers[tier].gating.probabilisticBasic;
}

export function canAccessProbabilisticAdvanced(tier: TierId): boolean {
  return tiers[tier].gating.probabilisticAdvanced;
}

export function isExportAllowed(tier: TierId, format: "csv" | "pdf" | "excel"): boolean {
  return tiers[tier].gating.exports.includes(format);
}

export function isAlertChannelAllowed(tier: TierId, channel: "email" | "sms" | "push"): boolean {
  return tiers[tier].gating.alerts.includes(channel);
}

export function getQueriesRemaining(tier: TierId, usedToday: number): number | "unlimited" {
  const allowed = tiers[tier].queriesPerDay;
  if (allowed === "unlimited") return "unlimited";
  return Math.max(allowed - usedToday, 0);
}

export function getTierDisplayName(tier: TierId): string {
  return tiers[tier].name;
}

export function getNextTier(currentTier: TierId): TierId | null {
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return null;
  }
  return tierOrder[currentIndex + 1];
}

export function formatTierPrice(tier: TierId, interval: "monthly" | "yearly" = "monthly"): string {
  const pricing = tiers[tier].pricing;
  const price = interval === "monthly" ? pricing.monthly : pricing.yearly;
  
  if (price === 0 && tier === "enterprise") {
    return "Contact sales";
  }
  
  if (price === 0) {
    return "Free";
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricing.currency,
    minimumFractionDigits: 0,
  }).format(price);
}

export function compareTiers(tier1: TierId, tier2: TierId): number {
  return tierOrder.indexOf(tier1) - tierOrder.indexOf(tier2);
}

export function isTierAtLeast(userTier: TierId, requiredTier: TierId): boolean {
  return compareTiers(userTier, requiredTier) >= 0;
}
