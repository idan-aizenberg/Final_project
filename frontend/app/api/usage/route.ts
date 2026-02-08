import { NextRequest, NextResponse } from "next/server";
import { tiers, type TierId } from "@/lib/tiers";
import { canPerformQuery, getQueriesRemaining } from "@/lib/tierValidation";

// In-memory storage for demo (replace with database in production)
const usageStore: Record<string, { count: number; date: string }> = {};

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getUserUsage(userId: string): number {
  const today = getTodayKey();
  const usage = usageStore[userId];
  
  if (!usage || usage.date !== today) {
    // Reset for new day
    usageStore[userId] = { count: 0, date: today };
    return 0;
  }
  
  return usage.count;
}

function incrementUserUsage(userId: string): number {
  const today = getTodayKey();
  const usage = usageStore[userId];
  
  if (!usage || usage.date !== today) {
    usageStore[userId] = { count: 1, date: today };
    return 1;
  }
  
  usage.count += 1;
  return usage.count;
}

/**
 * GET /api/usage
 * Get current usage statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from auth (mock for now - replace with real auth)
    const userId = request.headers.get("x-user-id") || "demo-user";
    const tierHeader = request.headers.get("x-user-tier") as TierId | null;
    const tier: TierId = tierHeader || "basic";
    
    const usedToday = getUserUsage(userId);
    const tierDef = tiers[tier];
    const remaining = getQueriesRemaining(tier, usedToday);
    
    // Calculate next reset time (midnight UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    return NextResponse.json({
      tier,
      tierName: tierDef.name,
      usedToday,
      limit: tierDef.queriesPerDay,
      remaining,
      nextReset: tomorrow.toISOString(),
      horizonDays: tierDef.horizonDays,
      features: {
        probabilistic: tierDef.gating.probabilisticBasic,
        extremeEvents: tierDef.gating.extremeEventsModerate,
        exports: tierDef.gating.exports,
        alerts: tierDef.gating.alerts,
        maxLocations: tierDef.gating.maxLocations,
      },
    });
  } catch (error: any) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch usage data",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/usage
 * Increment query usage for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from auth (mock for now - replace with real auth)
    const userId = request.headers.get("x-user-id") || "demo-user";
    const tierHeader = request.headers.get("x-user-tier") as TierId | null;
    const tier: TierId = tierHeader || "basic";
    
    const currentUsage = getUserUsage(userId);
    
    // Validate tier allows more queries
    const validation = canPerformQuery(tier, currentUsage);
    
    if (!validation.allowed) {
      return NextResponse.json(
        {
          error: validation.reason,
          upgradeRequired: validation.upgradeRequired,
          currentLimit: validation.currentLimit,
        },
        { status: 403 }
      );
    }
    
    // Increment usage
    const newCount = incrementUserUsage(userId);
    const tierDef = tiers[tier];
    const remaining = getQueriesRemaining(tier, newCount);
    
    return NextResponse.json({
      success: true,
      usedToday: newCount,
      remaining,
      limit: tierDef.queriesPerDay,
    });
  } catch (error: any) {
    console.error("Error incrementing usage:", error);
    return NextResponse.json(
      { 
        error: "Failed to increment usage",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usage
 * Reset usage for testing (admin only in production)
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    
    // Reset user's usage
    usageStore[userId] = { count: 0, date: getTodayKey() };
    
    return NextResponse.json({
      success: true,
      message: "Usage reset successfully",
    });
  } catch (error: any) {
    console.error("Error resetting usage:", error);
    return NextResponse.json(
      { 
        error: "Failed to reset usage",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

