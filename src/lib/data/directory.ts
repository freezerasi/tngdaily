import "server-only";

import { isDemoContentEnabled, isSupabaseConfigured } from "@/lib/env";
import { getPublicSupabase } from "@/lib/supabase/server";
import { DEMO_DIRECTORY_LISTINGS } from "@/lib/data/demo";
import type { DataResult, DirectoryListingView } from "@/lib/data/types";
import type { DirectoryListingRow } from "@/types/database";

/** Active directory listings for the /hustle bento grid. */
export async function getDirectoryListings(
  limit = 8,
): Promise<DataResult<DirectoryListingView[]>> {
  if (!isSupabaseConfigured()) {
    if (!isDemoContentEnabled()) return { data: [], source: "unconfigured" };
    return { data: DEMO_DIRECTORY_LISTINGS.slice(0, limit), source: "demo" };
  }

  const supabase = getPublicSupabase();
  if (!supabase) return { data: [], source: "unconfigured" };

  const { data, error } = await supabase
    .from("directory_listings")
    .select("*")
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], source: "supabase", error: error.message };

  const rows = (data ?? []) as DirectoryListingRow[];
  return {
    data: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      companyName: row.company_name,
      contactInfo: row.contact_info,
      location: row.location,
      priceRange: row.price_range,
      externalUrl: row.external_url,
      isPaid: row.is_paid,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
    source: "supabase",
  };
}
