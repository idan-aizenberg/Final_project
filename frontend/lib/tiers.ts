export type TierId = "basic" | "standard" | "professional" | "enterprise";

export interface TierDefinition {
  id: TierId;
  name: string;
  description: string;
  queriesPerDay: number | "unlimited";
  horizonDays: number;
  features: string[];
  gating: {
    probabilistic: boolean;
    extremeEvents: boolean;
    exports: Array<"csv" | "pdf" | "excel">;
    alerts: Array<"email" | "sms" | "push">;
    dashboards: number | "all";
  };
}

export const tiers: Record<TierId, TierDefinition> = {
  basic: {
    id: "basic",
    name: "Basic",
    description: "For quick weather checks and ad-hoc decisions.",
    queriesPerDay: 3,
    horizonDays: 14,
    features: ["Core metrics", "Single location", "No exports", "No alerts"],
    gating: {
      probabilistic: false,
      extremeEvents: false,
      exports: [],
      alerts: [],
      dashboards: 0,
    },
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "Growing teams planning multiple operations.",
    queriesPerDay: 10,
    horizonDays: 30,
    features: ["Extended metrics", "Limited probabilistic trends", "No alerts"],
    gating: {
      probabilistic: true,
      extremeEvents: false,
      exports: [],
      alerts: [],
      dashboards: 0,
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "Advanced planning with probabilistic insights.",
    queriesPerDay: 100,
    horizonDays: 180,
    features: ["Confidence intervals", "Moderate extreme events", "CSV/PDF/Excel exports", "Email alerts"],
    gating: {
      probabilistic: true,
      extremeEvents: true,
      exports: ["csv", "pdf", "excel"],
      alerts: ["email"],
      dashboards: 1,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Mission-critical operations with real-time responses.",
    queriesPerDay: "unlimited",
    horizonDays: 365,
    features: ["Multi-model blending", "All industry dashboards", "API integration", "SMS/Email/Push alerts"],
    gating: {
      probabilistic: true,
      extremeEvents: true,
      exports: ["csv", "pdf", "excel"],
      alerts: ["email", "sms", "push"],
      dashboards: "all",
    },
  },
};

export const tierOrder: TierId[] = ["basic", "standard", "professional", "enterprise"];

export function getTierById(id: TierId) {
  return tiers[id];
}

export function isExportAllowed(tier: TierId, format: "csv" | "pdf" | "excel") {
  return tiers[tier].gating.exports.includes(format);
}

export function isAlertChannelAllowed(tier: TierId, channel: "email" | "sms" | "push") {
  return tiers[tier].gating.alerts.includes(channel);
}

export function getQueriesRemaining(tier: TierId, usedToday: number) {
  const allowed = tiers[tier].queriesPerDay;
  if (allowed === "unlimited") return Infinity;
  return Math.max(allowed - usedToday, 0);
}
