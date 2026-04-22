// src/services/vehicleModelSearch.ts
import { supabase } from "./supabase";

export interface VehicleModelSearchResult {
  model_id: string;
  model_name: string;
  brand_id: string;
  brand_name: string;
  category_id: string;
  category_name: string;
}

/**
 * Autocomplete modelli veicolo
 * Usato in src/pages/Ingresso/index.tsx
 */
export async function searchVehicleModels(
  searchTerm: string,
  tenantId: string,
  limit: number = 10
): Promise<VehicleModelSearchResult[]> {
  if (!searchTerm || searchTerm.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from("vehicle_models")
      .select(`
        id,
        name,
        brand_id,
        category_id,
        vehicle_brands ( name ),
        vehicle_categories ( name )
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .ilike("name", `%${searchTerm}%`)
      .order("name")
      .limit(limit);

    if (error) {
      console.error("❌ Errore searchVehicleModels:", error);
      return [];
    }

    return (data || []).map((m) => ({
      model_id: m.id,
      model_name: m.name,
      brand_id: m.brand_id,
      brand_name: m.vehicle_brands?.name ?? "",
      category_id: m.category_id,
      category_name: m.vehicle_categories?.name ?? "",
    }));
  } catch (err) {
    console.error("❌ Errore in searchVehicleModels:", err);
    return [];
  }
}
