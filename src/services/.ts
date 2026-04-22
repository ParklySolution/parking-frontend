import { supabase } from "@/services/supabase";

export interface VehicleModelSearchResult {
  model_id: string;
  model_name: string;
  brand_id: string;
  brand_name: string;
  category_id: string;
  category_name: string;
}

export async function searchVehicleModels(
  search: string,
  tenantId: string,
  limit = 10
): Promise<VehicleModelSearchResult[]> {
  if (!search || search.length < 2) return [];

  const { data, error } = await supabase.rpc(
    "search_vehicle_models",
    {
      p_search: search,
      p_tenant_id: tenantId,
      p_limit: limit,
    }
  );

  if (error) {
    console.error("searchVehicleModels error", error);
    return [];
  }

  return data ?? [];
}
