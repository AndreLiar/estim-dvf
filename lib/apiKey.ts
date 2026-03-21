import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export function generateApiKey(): string {
  return "dvf_" + crypto.randomBytes(32).toString("hex");
}

export interface ApiKeyResult {
  valid: boolean;
  email?: string;
  plan?: string;
  usageCount?: number;
  usageLimit?: number;
  error?: string;
}

export async function validateApiKey(key: string): Promise<ApiKeyResult> {
  if (!key?.startsWith("dvf_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const { data, error } = await supabaseAdmin
    .from("pro_users")
    .select("email, plan, active, api_usage_count, api_usage_reset_at")
    .eq("api_key", key)
    .single();

  if (error || !data) {
    return { valid: false, error: "API key not found" };
  }

  if (!data.active) {
    return { valid: false, error: "Subscription inactive" };
  }

  // Reset monthly usage if needed
  const resetAt = new Date(data.api_usage_reset_at);
  const now = new Date();
  if (now >= resetAt) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabaseAdmin
      .from("pro_users")
      .update({ api_usage_count: 0, api_usage_reset_at: nextReset.toISOString() })
      .eq("api_key", key);
    data.api_usage_count = 0;
  }

  const limit = data.plan === "api" ? 10000 : null; // Pro users have no API limit via key

  if (limit !== null && data.api_usage_count >= limit) {
    return { valid: false, error: `Monthly limit of ${limit} requests reached` };
  }

  // Increment usage
  await supabaseAdmin
    .from("pro_users")
    .update({ api_usage_count: (data.api_usage_count ?? 0) + 1 })
    .eq("api_key", key);

  return {
    valid: true,
    email: data.email,
    plan: data.plan,
    usageCount: (data.api_usage_count ?? 0) + 1,
    usageLimit: limit ?? undefined,
  };
}
