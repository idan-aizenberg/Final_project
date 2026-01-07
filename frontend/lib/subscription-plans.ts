export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "monthly" | "yearly";
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Free tier for quick weather checks",
    price: 0,
    interval: "monthly",
    features: [
      "3 queries per day",
      "14-day forecast horizon",
      "Temperature & precipitation only",
      "No exports or alerts",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    description: "For operational weather tracking",
    price: 89,
    interval: "monthly",
    features: [
      "10 queries per day",
      "30-day forecast horizon",
      "Wind, solar & humidity",
      "Single-model probabilities",
    ],
    popular: true,
  },
  {
    id: "professional",
    name: "Professional",
    description: "For advanced forecasting needs",
    price: 249,
    interval: "monthly",
    features: [
      "100 queries per day",
      "180-day forecast horizon",
      "CSV, PDF & Excel exports",
      "Email alerts",
      "1 industry dashboard",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    price: 0,
    interval: "monthly",
    features: [
      "Unlimited queries",
      "365-day forecast horizon",
      "Multi-model blending",
      "SMS, Email & Push alerts",
      "API access",
    ],
  },
];

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}
