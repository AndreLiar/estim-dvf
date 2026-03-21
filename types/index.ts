// ─── DOMAIN TYPES ─────────────────────────────────────────────────────────────
// These are plain TypeScript interfaces that own nothing to Supabase.
// When you eject from Supabase, only services/ changes — never these.

export type Plan = "free" | "pro" | "api";
export type PropertyType = "Appartement" | "Maison";

export interface AuthUser {
  id: string;
  email: string;
}

export interface ProUser {
  userId: string;
  email: string;
  plan: Plan;
  active: boolean;
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface ApiKeyInfo {
  apiKey: string | null;
  plan: Plan;
  usageCount: number;
  usageLimit: number | null;
  resetAt: string | null;
}

export interface ApiKeyValidation {
  valid: boolean;
  email?: string;
  plan?: Plan;
  usageCount?: number;
  usageLimit?: number | null;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  isPro: boolean;
}

export interface PriceAlert {
  id: string;
  userId: string;
  codePostal: string;
  typeLocal: PropertyType;
  thresholdPct: number;
  lastMedian: number | null;
  lastChecked: string | null;
  active: boolean;
  createdAt: string;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  sentAt: string;
  oldMedian: number | null;
  newMedian: number | null;
  changePct: number | null;
}

export interface PortfolioProperty {
  id: string;
  userId: string;
  label: string | null;
  adresse: string | null;
  codePostal: string;
  typeLocal: PropertyType;
  surfaceM2: number;
  purchasePrice: number;
  purchaseDate: string;
  currentMedianPerM2: number | null;
  estimateUpdatedAt: string | null;
  createdAt: string;
}

export interface MarketCache {
  codePostal: string;
  typeLocal: PropertyType;
  cachedAt: string;
  medianPerM2: number;
  avgPerM2: number;
  p10PerM2: number;
  p90PerM2: number;
  volume: number;
  momentum12m: number | null;
  lastSaleDate: string | null;
  cityName: string;
  priceHistory: Array<{ year: string; medianPerM2: number; volume: number }>;
  fromCache?: boolean;
}

export interface EstimateResult {
  postalCode: string;
  city: string;
  type: string;
  surface: number;
  medianPricePerM2: number;
  avgPricePerM2: number;
  estimatedPrice: number;
  estimatedMin: number;
  estimatedMax: number;
  comparableSales: number;
  lastSaleDate: string | null;
  remainingToday: number | null;
  isPro: boolean;
  priceHistory: Array<{ year: string; medianPricePerM2: number }> | null;
  apiUsage?: { count: number; limit: number | null };
}
