// src/services/vehicleModelSearch.ts
import { getTenantVehicleModels } from "./tenantVehicleService";

export async function searchVehicleModels(
  searchTerm: string,
  tenantId: string,
  limit: number = 10
): Promise<VehicleModelSearchResult[]> {
  if (!searchTerm || searchTerm.length < 2) return [];

  try {
    // 🔥 USA IL BACKEND INVECE DI SUPABASE DIRETTO
    const allModels = await getTenantVehicleModels(tenantId);
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = allModels.filter(m => 
      m.name.toLowerCase().includes(searchLower)
    );
    
    const limited = filtered.slice(0, limit);
    
    return limited.map(m => ({
      model_id: m.id,
      model_name: m.name,
      brand_id: m.brand_id,
      brand_name: m.brand_name,
      category_id: m.category_id,
      category_name: m.category_name
    }));
  } catch (error) {
    console.error("❌ Errore in searchVehicleModels:", error);
    return [];
  }
}