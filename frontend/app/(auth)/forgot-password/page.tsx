"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card className="border-border/60 bg-card/90 shadow-[var(--elevation-medium)]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              <p>
                If you don't see the email in your inbox, check your spam folder. The link will expire in 24 hours.
              </p>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/sign-in">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
            <div className="text-center">
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="text-sm text-primary hover:text-primary/80"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <Card className="border-border/60 bg-card/90 shadow-[var(--elevation-medium)]">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>We'll help you get back into your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                "Sending reset link..."
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <Link href="/sign-in" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

