import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">WeatherSight Documentation</h1>
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
