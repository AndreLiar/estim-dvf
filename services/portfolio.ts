import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PortfolioProperty, PropertyType } from "@/types";

const MAX_PROPERTIES = 20;

function toProperty(row: Record<string, unknown>): PortfolioProperty {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    label: (row.label as string) ?? null,
    adresse: (row.adresse as string) ?? null,
    codePostal: row.code_postal as string,
    typeLocal: row.type_local as PropertyType,
    surfaceM2: Number(row.surface_m2),
    purchasePrice: Number(row.purchase_price),
    purchaseDate: row.purchase_date as string,
    currentMedianPerM2: row.current_median_per_m2 != null ? Number(row.current_median_per_m2) : null,
    estimateUpdatedAt: (row.estimate_updated_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * Returns all portfolio properties for a user, newest first.
 */
export async function listProperties(userId: string): Promise<PortfolioProperty[]> {
  const { data } = await supabaseAdmin
    .from("portfolio_properties")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(toProperty);
}

/**
 * Adds a new property to the portfolio.
 * Throws if the user has reached the 20-property limit.
 */
export async function addProperty(params: {
  userId: string;
  label?: string;
  adresse?: string;
  codePostal: string;
  typeLocal: PropertyType;
  surfaceM2: number;
  purchasePrice: number;
  purchaseDate: string;
  currentMedianPerM2: number | null;
}): Promise<PortfolioProperty> {
  // Enforce limit
  const { count } = await supabaseAdmin
    .from("portfolio_properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", params.userId);

  if ((count ?? 0) >= MAX_PROPERTIES) {
    throw new Error(`Limite de ${MAX_PROPERTIES} biens atteinte`);
  }

  const { data, error } = await supabaseAdmin
    .from("portfolio_properties")
    .insert({
      user_id: params.userId,
      label: params.label ?? null,
      adresse: params.adresse ?? null,
      code_postal: params.codePostal,
      type_local: params.typeLocal,
      surface_m2: params.surfaceM2,
      purchase_price: params.purchasePrice,
      purchase_date: params.purchaseDate,
      current_median_per_m2: params.currentMedianPerM2,
      estimate_updated_at: params.currentMedianPerM2 ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toProperty(data);
}

/**
 * Updates the DVF market estimate for a single property.
 */
export async function refreshPropertyEstimate(
  id: string,
  userId: string,
  newMedianPerM2: number
): Promise<PortfolioProperty> {
  const { data, error } = await supabaseAdmin
    .from("portfolio_properties")
    .update({
      current_median_per_m2: newMedianPerM2,
      estimate_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toProperty(data);
}

/**
 * Removes a property from the portfolio.
 * Scoped to the owner to prevent unauthorized deletion.
 */
export async function removeProperty(id: string, userId: string): Promise<void> {
  await supabaseAdmin
    .from("portfolio_properties")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

/**
 * Fetches a single property (for operations that need to read before update).
 */
export async function getProperty(
  id: string,
  userId: string
): Promise<Pick<PortfolioProperty, "codePostal" | "typeLocal"> | null> {
  const { data } = await supabaseAdmin
    .from("portfolio_properties")
    .select("code_postal, type_local")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!data) return null;
  return { codePostal: data.code_postal, typeLocal: data.type_local as PropertyType };
}
