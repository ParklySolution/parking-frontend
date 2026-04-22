// src/services/vehicleModelService.ts
import { supabase } from "./supabase";

export interface VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  brand_name?: string;
  category_name?: string;
}

export async function fetchVehicleModels(tenantId: string): Promise<VehicleModel[]> {
  console.log("🔍 fetchVehicleModels chiamato con tenantId:", tenantId);
  
  try {
    const { data, error } = await supabase
      .from("vehicle_models")
      .select(`
        id,
        name,
        is_active,
        created_at,
        brand_id,
        category_id
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("❌ Errore fetchVehicleModels:", error);
      throw error;
    }

    console.log(`✅ Trovati ${data?.length || 0} modelli`);
    return data || [];
  } catch (err) {
    console.error("❌ Errore in fetchVehicleModels:", err);
    return [];
  }
}

export async function searchModelsByBrand(
  tenantId: string,
  brandId: string
): Promise<VehicleModel[]> {
  console.log("🔍 searchModelsByBrand chiamato con:", { tenantId, brandId });
  
  try {
    const { data, error } = await supabase
      .from("vehicle_models")
      .select(`
        id,
        name,
        brand_id,
        category_id,
        is_active,
        created_at
      `)
      .eq("tenant_id", tenantId)
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("❌ Errore searchModelsByBrand:", error);
      throw error;
    }

    console.log(`✅ Trovati ${data?.length || 0} modelli per marca ${brandId}`);
    return data || [];
  } catch (err) {
    console.error("❌ Errore in searchModelsByBrand:", err);
    return [];
  }
}

export async function searchModels(
  tenantId: string,
  searchTerm: string
): Promise<VehicleModel[]> {
  if (!searchTerm || searchTerm.length < 2) return [];

  console.log("🔍 searchModels chiamato con:", { tenantId, searchTerm });
  
  try {
    const { data, error } = await supabase
      .from("vehicle_models")
      .select(`
        id,
        name,
        brand_id,
        category_id,
        is_active,
        created_at
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .ilike("name", `%${searchTerm}%`)
      .order("name")
      .limit(20);

    if (error) {
      console.error("❌ Errore searchModels:", error);
      throw error;
    }

    console.log(`✅ Trovati ${data?.length || 0} modelli per ricerca "${searchTerm}"`);
    return data || [];
  } catch (err) {
    console.error("❌ Errore in searchModels:", err);
    return [];
  }
}

export async function createVehicleModel(
  tenantId: string,
  name: string,
  brandId: string,
  categoryId: string
): Promise<VehicleModel> {
  console.log("🆕 Creazione nuovo modello:", { tenantId, name, brandId, categoryId });
  
  try {
    const { data, error } = await supabase
      .from("vehicle_models")
      .insert({
        tenant_id: tenantId,
        name,
        brand_id: brandId,
        category_id: categoryId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore createVehicleModel:", error);
      throw error;
    }

    console.log("✅ Modello creato con ID:", data.id);
    return data;
  } catch (err) {
    console.error("❌ Errore in createVehicleModel:", err);
    throw err;
  }
}

export async function updateVehicleModel(
  id: string,
  updates: Partial<VehicleModel>
): Promise<VehicleModel> {
  console.log("📝 Aggiornamento modello:", { id, updates });
  
  try {
    const { data, error } = await supabase
      .from("vehicle_models")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Errore updateVehicleModel:", error);
      throw error;
    }

    console.log("✅ Modello aggiornato");
    return data;
  } catch (err) {
    console.error("❌ Errore in updateVehicleModel:", err);
    throw err;
  }
}

export async function toggleVehicleModel(id: string, isActive: boolean): Promise<void> {
  console.log("🔄 Toggle modello:", { id, isActive });
  
  try {
    const { error } = await supabase
      .from("vehicle_models")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      console.error("❌ Errore toggleVehicleModel:", error);
      throw error;
    }

    console.log("✅ Toggle completato");
  } catch (err) {
    console.error("❌ Errore in toggleVehicleModel:", err);
    throw err;
  }
}

export async function deleteVehicleModel(id: string): Promise<void> {
  console.log("🗑️ Eliminazione (soft) modello:", id);
  
  try {
    const { error } = await supabase
      .from("vehicle_models")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("❌ Errore deleteVehicleModel:", error);
      throw error;
    }

    console.log("✅ Modello disattivato");
  } catch (err) {
    console.error("❌ Errore in deleteVehicleModel:", err);
    throw err;
  }
}