// src/services/tenantVehicleService.ts
import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function getTenantVehicleModels(tenantId: string): Promise<VehicleModel[]> {
  try {
    // 🔥 METODO CORRETTO per ottenere il token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      console.error("❌ Nessun token");
      return [];
    }
    
    console.log("🔑 Token ottenuto, lunghezza:", token.length);
    
    const response = await fetch(
      `${API_BASE_URL}/api/vehicles/models?tenantId=${tenantId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Errore ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log("✅ Ricevuti", result.data?.length, "modelli");
    
    return result.data || [];
  } catch (error) {
    console.error("❌ Errore in getTenantVehicleModels:", error);
    return [];
  }
}