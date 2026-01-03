'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Shield, Zap, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PaymentForm } from '@/components/PaymentForm'
import { tiers, type TierId, formatTierPrice, getTierById } from '@/lib/tiers'
import { useAuth } from '@/context/AuthContext'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, userProfile, updateSubscription } = useAuth()
  
  const planId = (searchParams.get('plan') || 'standard') as TierId
  const selectedTier = tiers[planId]
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [transactionData, setTransactionData] = useState<any>(null)

  const currentTier = userProfile?.subscription_tier || 'basic'
  const isUpgrade = tiers[planId] && tiers[currentTier] 
    ? tiers[planId].pricing.monthly > tiers[currentTier].pricing.monthly 
    : false
  const isDowngrade = tiers[planId] && tiers[currentTier]
    ? tiers[planId].pricing.monthly < tiers[currentTier].pricing.monthly
    : false

  const getTierIcon = (tier: TierId) => {
    switch (tier) {
      case 'professional':
        return <Crown className="h-5 w-5 text-purple-500" />
      case 'enterprise':
        return <Shield className="h-5 w-5 text-amber-500" />
      case 'standard':
        return <Zap className="h-5 w-5 text-blue-500" />
      default:
        return null
    }
  }

  if (!selectedTier || planId === 'enterprise') {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">
              {planId === 'enterprise' ? 'Enterprise Plan' : 'Invalid Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planId === 'enterprise' ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Enterprise plans require a custom quote. Please contact our sales team.
                </p>
                <div className="flex gap-3">
                  <Button asChild>
                    <a href="mailto:sales@weathersight.ai">Contact Sales</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/pricing">Back to Pricing</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
            <p className="text-sm text-destructive mb-4">The subscription plan you selected is not available.</p>
            <Link href="/pricing">
              <Button variant="outline">Back to Pricing</Button>
            </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle free plan selection
  if (selectedTier.pricing.monthly === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="text-center">
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>No payment required for the Basic plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-lg border border-primary/20 bg-background p-4">
              <h3 className="font-semibold">Basic Plan Includes:</h3>
              <ul className="space-y-2">
                {selectedTier.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  if (user) {
                    await updateSubscription('basic')
                  }
                  router.push('/dashboard')
                }}
                className="flex-1"
              >
                {user ? 'Activate Free Plan' : 'Get Started Free'}
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/pricing">View Other Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePaymentSuccess = async (paymentData: any) => {
    setIsProcessing(true)
    setTransactionData(paymentData)
    
    try {
      // Update subscription in database if user is authenticated
      if (user) {
        await updateSubscription(planId)
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setPaymentSuccess(true)
      setIsProcessing(false)
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard?subscription=success')
      }, 3000)
    } catch (error) {
      console.error('Error updating subscription:', error)
      setIsProcessing(false)
      // Still show success for demo purposes
      setPaymentSuccess(true)
      setTimeout(() => {
        router.push('/dashboard?subscription=success')
      }, 3000)
    }
  }

  if (paymentSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card className="border-green-500/50 bg-green-500/10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-green-600">
              {isUpgrade ? 'Upgrade Successful!' : 'Subscription Activated!'}
            </CardTitle>
            <CardDescription>
              Your {selectedTier.name} plan is now active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Details */}
            <div className="space-y-3 rounded-lg border border-green-200 bg-white dark:bg-card p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono font-semibold">{transactionData?.transactionId}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-semibold flex items-center gap-2">
                  {getTierIcon(planId)}
                  {selectedTier.name}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{formatTierPrice(planId)}/month</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Card:</span>
                <span className="font-mono">•••• •••• •••• {transactionData?.cardLast4}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-semibold">
                  {new Date(transactionData?.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* New Features */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="font-semibold text-sm mb-2">You now have access to:</h4>
              <ul className="space-y-1">
                {selectedTier.features.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirmation Message */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                A confirmation email has been sent to <strong>{transactionData?.email}</strong>. 
                You will be redirected to your dashboard in a few seconds.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => router.push('/search')}
                variant="outline"
                className="flex-1"
              >
                Start Searching
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isUpgrade ? 'Upgrade Your Plan' : isDowngrade ? 'Change Your Plan' : 'Complete Your Purchase'}
        </h1>
        <p className="text-muted-foreground">
          {isUpgrade 
            ? `Upgrading from ${tiers[currentTier].name} to ${selectedTier.name}`
            : 'Review your plan and complete the payment process'
          }
        </p>
      </div>

      {/* Upgrade/Downgrade Banner */}
      {userProfile && currentTier !== planId && (
        <Card className={`mb-6 ${isUpgrade ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {getTierIcon(planId)}
              <div>
                <p className="font-semibold">
                  {isUpgrade ? 'Upgrading' : 'Changing'} from {tiers[currentTier].name} to {selectedTier.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isUpgrade 
                    ? 'Your new features will be available immediately after payment.'
                    : 'Changes will take effect at your next billing cycle.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Enter your card details below (Demo Mode)</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentForm
                plan={{
                  id: selectedTier.id,
                  name: selectedTier.name,
                  description: selectedTier.description,
                  price: selectedTier.pricing.monthly,
                  interval: 'monthly',
                  features: selectedTier.features,
                }}
                onSuccess={handlePaymentSuccess}
                isLoading={isProcessing}
              />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/90 sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Details */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {getTierIcon(planId)}
                  <div>
                      <h3 className="font-semibold text-foreground">{selectedTier.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{selectedTier.description}</p>
                    </div>
                  </div>
                </div>

                {/* Key Features */}
                    <Separator />
                    <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Key Benefits:</p>
                      <ul className="space-y-2">
                    <li className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{selectedTier.queriesPerDay === 'unlimited' ? 'Unlimited' : selectedTier.queriesPerDay} queries/day</span>
                    </li>
                    <li className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{selectedTier.horizonDays}-day forecast horizon</span>
                    </li>
                    {selectedTier.gating.probabilistic && (
                      <li className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Probabilistic insights</span>
                      </li>
                    )}
                    {selectedTier.gating.extremeEvents && (
                      <li className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Extreme event scouting</span>
                      </li>
                    )}
                    {selectedTier.gating.exports.length > 0 && (
                      <li className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{selectedTier.gating.exports.map(e => e.toUpperCase()).join('/')} exports</span>
                      </li>
                    )}
                    {selectedTier.gating.alerts.length > 0 && (
                      <li className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{selectedTier.gating.alerts.join(', ')} alerts</span>
                          </li>
                        )}
                      </ul>
                    </div>
              </div>

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly price</span>
                  <span className="font-medium">{formatTierPrice(planId)}</span>
                </div>
                {selectedTier.pricing.yearly > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Annual option</span>
                    <span className="text-green-600">{formatTierPrice(planId, 'yearly')}/yr (save 17%)</span>
                </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total today</span>
                  <span className="text-lg font-bold text-primary">
                    {formatTierPrice(planId)}
                  </span>
                </div>
              </div>

              {/* Billing Terms */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p>✓ Cancel anytime</p>
                <p>✓ 14-day money-back guarantee</p>
                <p>✓ Secure payment processing</p>
              </div>

              {/* Current User Info */}
              {user && (
                <>
                  <Separator />
                  <div className="text-xs">
                    <p className="text-muted-foreground">Billing to:</p>
                    <p className="font-medium text-foreground mt-1">{user.email}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security Footer */}
      <div className="mt-8 pt-8 border-t border-border/60">
        <p className="text-xs text-muted-foreground text-center">
          🔒 This is a demo checkout. No real charges will be processed. 
          Your payment information is for demonstration purposes only.
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-4xl mx-auto py-12 px-4">
        <Card className="border-border/60 bg-card/90">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading checkout...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
