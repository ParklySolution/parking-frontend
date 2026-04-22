// src/services/vehicleBrandService.ts
import { supabase } from "./supabase";

export interface VehicleBrand {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export async function fetchVehicleBrands(tenantId: string): Promise<VehicleBrand[]> {
  console.log("🔍 fetchVehicleBrands chiamato con tenantId:", tenantId);
  
  try {
    const { data, error } = await supabase
      .from("vehicle_brands")
      .select("id, name, is_active, created_at")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("❌ Errore fetchVehicleBrands:", error);
      throw error;
    }

    console.log(`✅ Trovati ${data?.length || 0} marche`);
    return data || [];
  } catch (err) {
    console.error("❌ Errore in fetchVehicleBrands:", err);
    return [];
  }
}

export async function createVehicleBrand(
  tenantId: string,
  name: string
): Promise<VehicleBrand> {
  console.log("🆕 Creazione nuova marca:", { tenantId, name });
  
  try {
    const { data, error } = await supabase
      .from("vehicle_brands")
      .insert({
        tenant_id: tenantId,
        name,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore createVehicleBrand:", error);
      throw error;
    }

    console.log("✅ Marca creata con ID:", data.id);
    return data;
  } catch (err) {
    console.error("❌ Errore in createVehicleBrand:", err);
    throw err;
  }
}

export async function updateVehicleBrand(
  id: string,
  updates: Partial<VehicleBrand>
): Promise<VehicleBrand> {
  console.log("📝 Aggiornamento marca:", { id, updates });
  
  try {
    const { data, error } = await supabase
      .from("vehicle_brands")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Errore updateVehicleBrand:", error);
      throw error;
    }

    console.log("✅ Marca aggiornata");
    return data;
  } catch (err) {
    console.error("❌ Errore in updateVehicleBrand:", err);
    throw err;
  }
}

export async function toggleVehicleBrand(id: string, isActive: boolean): Promise<void> {
  console.log("🔄 Toggle marca:", { id, isActive });
  
  try {
    const { error } = await supabase
      .from("vehicle_brands")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      console.error("❌ Errore toggleVehicleBrand:", error);
      throw error;
    }

    console.log("✅ Toggle completato");
  } catch (err) {
    console.error("❌ Errore in toggleVehicleBrand:", err);
    throw err;
  }
}