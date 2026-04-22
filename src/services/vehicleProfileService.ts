import { supabase } from "@/services/supabase";
import type { VehicleProfileByPlate } from "@/types/vehicleProfile";

/**
 * Recupera il profilo veicolo completo partendo dalla targa
 */
export async function fetchVehicleProfileByPlate(
  plate: string,
  tenantId: string
): Promise<VehicleProfileByPlate | null> {
  const { data, error } = await supabase
    .from("vehicle_profiles")
    .select(`
      id,
      plate,

      vehicle_models (
        id,
        name
      ),

      vehicle_brands (
        id,
        name
      ),

      vehicle_categories (
        id,
        name
      ),

      vehicle_colors (
        id,
        name,
        hex
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("plate", plate)
    .maybeSingle();

  if (error) {
    console.error("fetchVehicleProfileByPlate error", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    plate: data.plate,

    model: data.vehicle_models,
    brand: data.vehicle_brands,
    category: data.vehicle_categories,
    color: data.vehicle_colors,
  };
}
