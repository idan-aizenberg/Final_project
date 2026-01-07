import { tiers, tierOrder, type TierId } from "./tiers";

export interface TierValidationResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: TierId;
  currentLimit?: number | string;
}

/**
 * Get the next tier upgrade from the current tier
 */
export function getNextTier(currentTier: TierId): TierId | null {
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return null;
  }
  return tierOrder[currentIndex + 1];
}

/**
 * Get the minimum tier required for a specific feature
 */
export function getMinimumTierForFeature(
  feature: "extendedMetrics" | "probabilisticBasic" | "probabilisticAdvanced" | "extremeEventsModerate" | "extremeEventsRealtime" | "exports" | "alerts" | "dashboards"
): TierId {
  for (const tierId of tierOrder) {
    const tier = tiers[tierId];
    const value = tier.gating[feature];
    
    if (typeof value === "boolean") {
      if (value === true) return tierId;
    } else if (Array.isArray(value)) {
      if (value.length > 0) return tierId;
    } else if (feature === "dashboards") {
      if (value === "all" || (typeof value === "number" && value > 0)) return tierId;
    }
  }
  return "enterprise"; // Default to highest tier if not found
}

/**
 * Check if user can perform a query based on daily limit
 */
export function canPerformQuery(
  tier: TierId,
  queriesUsedToday: number
): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.queriesPerDay === "unlimited") {
    return { allowed: true };
  }
  
  if (queriesUsedToday >= tierDef.queriesPerDay) {
    const nextTier = getNextTier(tier);
    return {
      allowed: false,
      reason: `Daily query limit (${tierDef.queriesPerDay}) reached. Resets at midnight.`,
      upgradeRequired: nextTier || undefined,
      currentLimit: tierDef.queriesPerDay,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if requested forecast horizon is within tier limits
 */
export function canAccessHorizon(
  tier: TierId,
  requestedDays: number
): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (requestedDays <= tierDef.horizonDays) {
    return { allowed: true };
  }
  
  // Find the minimum tier that supports this horizon
  let requiredTier: TierId | undefined;
  for (const tierId of tierOrder) {
    if (tiers[tierId].horizonDays >= requestedDays) {
      requiredTier = tierId;
      break;
    }
  }
  
  return {
    allowed: false,
    reason: `Forecast horizon limited to ${tierDef.horizonDays} days on ${tierDef.name} plan`,
    upgradeRequired: requiredTier,
    currentLimit: tierDef.horizonDays,
  };
}

/**
 * Check if user can export in a specific format
 */
export function canExport(
  tier: TierId,
  format: "csv" | "pdf" | "excel"
): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.exports.includes(format)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `${format.toUpperCase()} exports require ${tiers.professional.name} plan or higher`,
    upgradeRequired: "professional",
  };
}

/**
 * Check if user can use a specific alert channel
 */
export function canUseAlertChannel(
  tier: TierId,
  channel: "email" | "sms" | "push"
): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.alerts.includes(channel)) {
    return { allowed: true };
  }
  
  // Find minimum tier that supports this channel
  let requiredTier: TierId = "professional";
  for (const tierId of tierOrder) {
    if (tiers[tierId].gating.alerts.includes(channel)) {
      requiredTier = tierId;
      break;
    }
  }
  
  return {
    allowed: false,
    reason: `${channel.toUpperCase()} alerts require ${tiers[requiredTier].name} plan`,
    upgradeRequired: requiredTier,
  };
}

/**
 * Check if user can access extended metrics (wind, solar, humidity)
 */
export function canAccessExtendedMetrics(tier: TierId): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.extendedMetrics) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: "Wind, solar radiation, and humidity require Standard plan or higher",
    upgradeRequired: "standard",
  };
}

/**
 * Check if user can access basic probabilistic insights (single-model)
 */
export function canAccessProbabilisticBasic(tier: TierId): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.probabilisticBasic) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: "Probabilistic insights require Standard plan or higher",
    upgradeRequired: "standard",
  };
}

/**
 * Check if user can access advanced probabilistic features (multi-model)
 */
export function canAccessProbabilisticAdvanced(tier: TierId): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.probabilisticAdvanced) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: "Advanced probabilistic features require Professional plan or higher",
    upgradeRequired: "professional",
  };
}

/**
 * Check if user can access moderate-risk extreme events
 */
export function canAccessExtremeEventsModerate(tier: TierId): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.extremeEventsModerate) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: "Extreme event predictions require Professional plan or higher",
    upgradeRequired: "professional",
  };
}

/**
 * Check if user can access real-time high-risk extreme events
 */
export function canAccessExtremeEventsRealtime(tier: TierId): TierValidationResult {
  const tierDef = tiers[tier];
  
  if (tierDef.gating.extremeEventsRealtime) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: "Real-time extreme weather alerts require Enterprise plan",
    upgradeRequired: "enterprise",
  };
}

/**
 * Check if user can save more locations
 */
export function canSaveLocation(
  tier: TierId,
  currentLocationCount: number
): TierValidationResult {
  const tierDef = tiers[tier];
  const maxLocations = tierDef.gating.maxLocations;
  
  if (maxLocations === "unlimited") {
    return { allowed: true };
  }
  
  if (currentLocationCount >= maxLocations) {
    const nextTier = getNextTier(tier);
    return {
      allowed: false,
      reason: `Location limit (${maxLocations}) reached on ${tierDef.name} plan`,
      upgradeRequired: nextTier || undefined,
      currentLimit: maxLocations,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can save more searches (uses same limit as locations)
 */
export function canSaveSearch(
  tier: TierId,
  currentSearchCount: number
): TierValidationResult {
  const tierDef = tiers[tier];
  const limit = tierDef.gating.maxLocations;
  
  if (limit === "unlimited") {
    return { allowed: true };
  }
  
  if (currentSearchCount >= limit) {
    const nextTier = getNextTier(tier);
    return {
      allowed: false,
      reason: `Saved search limit (${limit}) reached on ${tierDef.name} plan`,
      upgradeRequired: nextTier || undefined,
      currentLimit: limit,
    };
  }
  
  return { allowed: true };
}

/**
 * Get the saved search limit for a tier
 */
export function getSavedSearchLimit(tier: TierId): number | "unlimited" {
  return tiers[tier].gating.maxLocations;
}

/**
 * Check if user can access industry dashboards
 */
export function canAccessDashboard(
  tier: TierId,
  dashboardCount: number = 1
): TierValidationResult {
  const tierDef = tiers[tier];
  const allowedDashboards = tierDef.gating.dashboards;
  
  if (allowedDashboards === "all") {
    return { allowed: true };
  }
  
  if (typeof allowedDashboards === "number" && dashboardCount <= allowedDashboards) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: allowedDashboards === 0
      ? "Industry dashboards require Professional plan or higher"
      : `Only ${allowedDashboards} dashboard(s) allowed on ${tierDef.name} plan`,
    upgradeRequired: allowedDashboards === 0 ? "professional" : "enterprise",
    currentLimit: allowedDashboards,
  };
}

/**
 * Get remaining queries for today
 */
export function getQueriesRemaining(tier: TierId, usedToday: number): number | "unlimited" {
  const allowed = tiers[tier].queriesPerDay;
  if (allowed === "unlimited") return "unlimited";
  return Math.max(allowed - usedToday, 0);
}

/**
 * Calculate query cost based on parameters
 */
export function calculateQueryCost(params: {
  horizonDays: number;
  resolution: "daily" | "weekly" | "monthly";
  forecastType: "standard" | "probabilistic" | "extreme";
}): number {
  let baseCost = 1;
  
  // Horizon affects cost
  if (params.horizonDays > 30) baseCost += 1;
  if (params.horizonDays > 90) baseCost += 1;
  if (params.horizonDays > 180) baseCost += 1;
  
  // Resolution affects cost
  if (params.resolution === "daily") baseCost += 1;
  
  // Forecast type affects cost
  if (params.forecastType === "probabilistic") baseCost += 1;
  if (params.forecastType === "extreme") baseCost += 2;
  
  return baseCost;
}

/**
 * Validate all tier requirements for a forecast query
 */
export function validateForecastQuery(
  tier: TierId,
  queriesUsedToday: number,
  params: {
    horizonDays: number;
    forecastType: "standard" | "probabilistic" | "extreme";
  }
): TierValidationResult {
  // Check query limit
  const queryCheck = canPerformQuery(tier, queriesUsedToday);
  if (!queryCheck.allowed) return queryCheck;
  
  // Check horizon limit
  const horizonCheck = canAccessHorizon(tier, params.horizonDays);
  if (!horizonCheck.allowed) return horizonCheck;
  
  // Check forecast type access
  if (params.forecastType === "probabilistic") {
    const probCheck = canAccessProbabilisticBasic(tier);
    if (!probCheck.allowed) return probCheck;
  }
  
  if (params.forecastType === "extreme") {
    const extremeCheck = canAccessExtremeEventsModerate(tier);
    if (!extremeCheck.allowed) return extremeCheck;
  }
  
  return { allowed: true };
}

