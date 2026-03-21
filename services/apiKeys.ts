import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ApiKeyInfo, ApiKeyValidation, Plan } from "@/types";

const API_USAGE_LIMITS: Record<string, number> = {
  api: 10000,
};

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "dvf_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Validates an API key and increments usage if valid.
 * Returns a clean validation result — no Supabase types exposed.
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  const { data } = await supabaseAdmin
    .from("pro_users")
    .select("email, plan, active, api_usage_count, api_usage_reset_at")
    .eq("api_key", key)
    .single();

  if (!data || !data.active) return { valid: false, error: "Clé API invalide" };

  const limit = API_USAGE_LIMITS[data.plan] ?? null;
  const now = new Date();
  const resetAt = data.api_usage_reset_at ? new Date(data.api_usage_reset_at) : null;
  const needsReset = !resetAt || now > resetAt;

  let usageCount: number = needsReset ? 0 : (data.api_usage_count ?? 0);

  if (limit !== null && usageCount >= limit) {
    return {
      valid: false,
      error: `Quota mensuel atteint (${limit} requêtes)`,
      usageCount,
      usageLimit: limit,
    };
  }

  // Increment usage
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  await supabaseAdmin
    .from("pro_users")
    .update({
      api_usage_count: usageCount + 1,
      ...(needsReset ? { api_usage_reset_at: nextReset } : {}),
    })
    .eq("api_key", key);

  return {
    valid: true,
    email: data.email,
    plan: data.plan as Plan,
    usageCount: usageCount + 1,
    usageLimit: limit,
  };
}

/**
 * Fetches API key info for a user by email.
 */
export async function getApiKeyInfo(email: string): Promise<ApiKeyInfo | null> {
  const { data } = await supabaseAdmin
    .from("pro_users")
    .select("plan, api_key, api_usage_count, api_usage_reset_at, active")
    .eq("email", email)
    .single();

  if (!data || !data.active) return null;

  const limit = API_USAGE_LIMITS[data.plan] ?? null;
  return {
    apiKey: data.api_key ?? null,
    plan: data.plan as Plan,
    usageCount: data.api_usage_count ?? 0,
    usageLimit: limit,
    resetAt: data.api_usage_reset_at ?? null,
  };
}

/**
 * Generates a new API key for a user and replaces the old one.
 */
export async function rotateApiKey(email: string): Promise<string> {
  const newKey = generateKey();
  await supabaseAdmin
    .from("pro_users")
    .update({ api_key: newKey, api_usage_count: 0 })
    .eq("email", email);
  return newKey;
}

/**
 * Creates a fresh API key for a new API-plan subscriber.
 * Safe to call multiple times — only sets if not already set.
 */
export async function provisionApiKey(email: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("pro_users")
    .select("api_key")
    .eq("email", email)
    .single();

  if (data?.api_key) return data.api_key;

  const newKey = generateKey();
  await supabaseAdmin
    .from("pro_users")
    .update({ api_key: newKey })
    .eq("email", email);
  return newKey;
}
