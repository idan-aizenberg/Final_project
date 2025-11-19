'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PaymentForm } from '@/components/PaymentForm'
import { SUBSCRIPTION_PLANS, getPlanById, formatPrice } from '@/lib/subscription-plans'
import { useAuth } from '@/context/AuthContext'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, updateSubscription } = useAuth()
  
  const planId = searchParams.get('plan') || 'pro'
  const selectedPlan = getPlanById(planId)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [transactionData, setTransactionData] = useState<any>(null)

  if (!selectedPlan) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive mb-4">The subscription plan you selected is not available.</p>
            <Link href="/pricing">
              <Button variant="outline">Back to Pricing</Button>
            </Link>
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
      if (user && selectedPlan.id !== 'basic' && selectedPlan.id !== 'enterprise') {
        await updateSubscription(selectedPlan.id as 'basic' | 'standard' | 'professional' | 'enterprise')
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setPaymentSuccess(true)
      setIsProcessing(false)
      
      // Redirect to account after 3 seconds
      setTimeout(() => {
        router.push('/account?subscription=success')
      }, 3000)
    } catch (error) {
      console.error('Error updating subscription:', error)
      setIsProcessing(false)
      // Still show success for demo purposes
      setPaymentSuccess(true)
      setTimeout(() => {
        router.push('/account?subscription=success')
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
            <CardTitle className="text-green-600">Payment Successful!</CardTitle>
            <CardDescription>Your subscription has been activated</CardDescription>
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
                <span className="font-semibold capitalize">{transactionData?.plan}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{formatPrice(transactionData?.amount)}/month</span>
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

            {/* Confirmation Message */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                A confirmation email has been sent to <strong>{transactionData?.email}</strong>. 
                You will be redirected to your account dashboard in a few seconds.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => router.push('/account')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Go to Dashboard Now
              </Button>
              <Button
                onClick={() => router.push('/pricing')}
                variant="outline"
                className="flex-1"
              >
                Back to Plans
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Purchase</h1>
        <p className="text-muted-foreground">Review your plan and complete the payment process</p>
      </div>

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
                plan={selectedPlan}
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
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedPlan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{selectedPlan.description}</p>
                  </div>
                </div>

                {/* Features */}
                {selectedPlan.price > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Includes:</p>
                      <ul className="space-y-2">
                        {selectedPlan.features.slice(0, 4).map((feature, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {selectedPlan.features.length > 4 && (
                          <li className="text-xs text-primary">+{selectedPlan.features.length - 4} more...</li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(selectedPlan.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Monthly Total</span>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(selectedPlan.price)}
                  </span>
                </div>
              </div>

              {/* Billing Terms */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p>✓ Cancel anytime</p>
                <p>✓ No long-term commitment</p>
                <p>✓ Secure payment</p>
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
