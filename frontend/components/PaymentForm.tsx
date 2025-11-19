'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubscriptionPlan, formatPrice } from '@/lib/subscription-plans'

interface PaymentFormProps {
  plan: SubscriptionPlan
  onSuccess: (paymentData: any) => void
  isLoading?: boolean
}

export function PaymentForm({ plan, onSuccess, isLoading = false }: PaymentFormProps) {
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    email: '',
  })

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '')
    if (!/^\d*$/.test(value)) return
    value = value.slice(0, 16)
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim()
    setFormData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4)
    }
    setFormData(prev => ({ ...prev, cardExpiry: value.slice(0, 5) }))
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setFormData(prev => ({ ...prev, cardCvc: value }))
  }

  const validateForm = (): boolean => {
    setError('')

    if (!formData.cardName.trim()) {
      setError('Card holder name is required')
      return false
    }

    const cardNum = formData.cardNumber.replace(/\s/g, '')
    if (cardNum.length !== 16) {
      setError('Card number must be 16 digits')
      return false
    }

    if (!formData.cardExpiry || formData.cardExpiry.length !== 5) {
      setError('Expiry date must be in MM/YY format')
      return false
    }

    if (formData.cardCvc.length < 3) {
      setError('CVC must be 3 or 4 digits')
      return false
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Valid email is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Demo payment successful
      onSuccess({
        transactionId: `TXN-${Date.now()}`,
        amount: plan.price,
        plan: plan.id,
        email: formData.email,
        timestamp: new Date().toISOString(),
        cardLast4: formData.cardNumber.slice(-4),
      })
    } catch (err) {
      setError('Payment processing failed. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Summary */}
      <div className="rounded-lg border border-border/60 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">{plan.name} Plan</h3>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(plan.price)}
            {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardName">Cardholder Name</Label>
        <Input
          id="cardName"
          placeholder="John Doe"
          value={formData.cardName}
          onChange={(e) => setFormData(prev => ({ ...prev, cardName: e.target.value }))}
          disabled={isLoading}
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          disabled={isLoading}
          required
        />
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={handleCardNumberChange}
            maxLength={19}
            disabled={isLoading}
            required
          />
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cardExpiry">Expiry Date</Label>
          <Input
            id="cardExpiry"
            placeholder="MM/YY"
            value={formData.cardExpiry}
            onChange={handleExpiryChange}
            maxLength={5}
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cardCvc">CVC</Label>
          <Input
            id="cardCvc"
            placeholder="123"
            value={formData.cardCvc}
            onChange={handleCvcChange}
            maxLength={4}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || plan.price === 0}
        className="w-full bg-primary hover:bg-primary/90"
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="inline-block animate-spin mr-2">⏳</span>
            Processing Payment...
          </>
        ) : plan.price === 0 ? (
          'Contact Sales'
        ) : (
          `Pay ${formatPrice(plan.price)} Now`
        )}
      </Button>

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Demo only - No real charges will be made</span>
      </div>
    </form>
  )
}
