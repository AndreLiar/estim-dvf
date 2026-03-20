import { supabaseAdmin } from "./supabase";

const FREE_LIMIT = 5;

export async function checkRateLimit(
  ip: string,
  proToken: string | null
): Promise<{ allowed: boolean; remaining: number; isPro: boolean }> {

  // Check if token is valid Pro token
  if (proToken) {
    const { data } = await supabaseAdmin
      .from("pro_users")
      .select("id")
      .eq("token", proToken)
      .eq("active", true)
      .single();

    if (data) return { allowed: true, remaining: 999, isPro: true };
  }

  // Free tier: count today's requests from this IP
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("usage_log")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since.toISOString());

  const used = count ?? 0;

  if (used >= FREE_LIMIT) {
    return { allowed: false, remaining: 0, isPro: false };
  }

  // Log this request
  await supabaseAdmin.from("usage_log").insert({ ip });

  return { allowed: true, remaining: FREE_LIMIT - used - 1, isPro: false };
}
