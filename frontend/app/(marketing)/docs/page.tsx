"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shield, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function DocsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile && userProfile.subscription_tier !== 'enterprise') {
      // Redirect non-enterprise users to pricing page
      router.push('/pricing');
    }
  }, [userProfile, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-enterprise users
  if (userProfile?.subscription_tier !== 'enterprise') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md rounded-3xl border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Lock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Enterprise Feature</CardTitle>
            <CardDescription className="text-base">
              Documentation access is exclusively available to Enterprise tier subscribers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Upgrade to Enterprise to unlock full API documentation, SDKs, webhooks, and dedicated support.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1 rounded-full" asChild>
                <Link href="/pricing">
                  <Shield className="mr-2 h-4 w-4" />
                  View Enterprise Plan
                </Link>
              </Button>
              <Button variant="outline" className="flex-1 rounded-full" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Shield className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">WeatherSight Documentation</h1>
            <p className="text-sm text-amber-600">Enterprise Access</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          End-to-end guide for building probabilistic weather intelligence into your workflows. SDKs, API contracts,
          and industry templates ship with the enterprise plan.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/search">Create a forecast</Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>REST API</CardTitle>
            <CardDescription>Authenticate, submit forecasts, and retrieve probabilistic outputs.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Endpoints for forecast queries, alert management, and custom industry dashboards.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>SDKs & Webhooks</CardTitle>
            <CardDescription>Drop-in integrations for TypeScript, Python, and realtime event streaming.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Enterprise plans unlock push channels, custom webhook templates, and analytics pipelines.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
