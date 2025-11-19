export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'monthly' | 'yearly'
  features: string[]
  popular?: boolean
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'For quick weather checks and ad-hoc decisions',
    price: 0,
    interval: 'monthly',
    features: [
      'Core metrics',
      'Single location',
      'No exports',
      'No alerts',
      '3 queries per day'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'For operational weather tracking',
    price: 89,
    interval: 'monthly',
    features: [
      'Unlimited queries',
      'Multiple locations',
      'CSV & PDF exports',
      'Email & SMS alerts',
      '30-day horizon'
    ],
    popular: true
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For advanced forecasting needs',
    price: 249,
    interval: 'monthly',
    features: [
      'Everything in Standard',
      'Probabilistic insights',
      'Extreme event scouting',
      'All export formats',
      'Advanced dashboards',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 0,
    interval: 'monthly',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      '24/7 phone support',
      'SLA guarantee',
      'White-label options'
    ]
  }
]

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === id)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}
