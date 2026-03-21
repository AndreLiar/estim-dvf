import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PriceAlert, AlertHistory, PropertyType } from "@/types";

function toAlert(row: Record<string, unknown>): PriceAlert {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    codePostal: row.code_postal as string,
    typeLocal: row.type_local as PropertyType,
    thresholdPct: Number(row.threshold_pct),
    lastMedian: row.last_median != null ? Number(row.last_median) : null,
    lastChecked: (row.last_checked as string) ?? null,
    active: row.active as boolean,
    createdAt: row.created_at as string,
  };
}

/**
 * Returns all active price alerts for a user.
 */
export async function listAlerts(userId: string): Promise<PriceAlert[]> {
  const { data } = await supabaseAdmin
    .from("price_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (data ?? []).map(toAlert);
}

/**
 * Returns ALL active alerts across all users (used by the cron job).
 */
export async function listAllActiveAlerts(): Promise<PriceAlert[]> {
  const { data } = await supabaseAdmin
    .from("price_alerts")
    .select("*")
    .eq("active", true);

  return (data ?? []).map(toAlert);
}

/**
 * Creates a new price alert with an optional DVF baseline median.
 */
export async function createAlert(params: {
  userId: string;
  codePostal: string;
  typeLocal: PropertyType;
  thresholdPct: number;
  lastMedian: number | null;
}): Promise<PriceAlert> {
  const { data, error } = await supabaseAdmin
    .from("price_alerts")
    .insert({
      user_id: params.userId,
      code_postal: params.codePostal,
      type_local: params.typeLocal,
      threshold_pct: params.thresholdPct,
      last_median: params.lastMedian,
      last_checked: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toAlert(data);
}

/**
 * Soft-deletes an alert (sets active = false).
 * Scoped to the owner to prevent unauthorized deletion.
 */
export async function deactivateAlert(id: string, userId: string): Promise<void> {
  await supabaseAdmin
    .from("price_alerts")
    .update({ active: false })
    .eq("id", id)
    .eq("user_id", userId);
}

/**
 * Updates the baseline median and last-checked timestamp for an alert.
 * Called by the cron job after each price check.
 */
export async function updateAlertBaseline(
  id: string,
  newMedian: number
): Promise<void> {
  await supabaseAdmin
    .from("price_alerts")
    .update({ last_median: newMedian, last_checked: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Records a fired alert in the history table.
 */
export async function recordAlertFired(params: {
  alertId: string;
  oldMedian: number;
  newMedian: number;
  changePct: number;
}): Promise<AlertHistory> {
  const { data, error } = await supabaseAdmin
    .from("alert_history")
    .insert({
      alert_id: params.alertId,
      old_median: params.oldMedian,
      new_median: params.newMedian,
      change_pct: params.changePct,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    alertId: data.alert_id,
    sentAt: data.sent_at,
    oldMedian: data.old_median,
    newMedian: data.new_median,
    changePct: data.change_pct,
  };
}
