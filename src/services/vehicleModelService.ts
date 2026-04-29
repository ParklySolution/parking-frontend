// src/services/vehicleModelService.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface VehicleModel {
  id: string;
  global_model_id: string | null;
  brand_id: string;
  brand_name?: string;
  category_id: string;
  category_name?: string;
  name: string;
  is_active: boolean;
  is_custom: boolean;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetchVehicleModels(tenantId: string): Promise<VehicleModel[]> {
  console.log("🔍 fetchVehicleModels chiamato con tenantId:", tenantId);
  
  try {
    const token = await getToken();
    if (!token) {
      console.error("❌ Nessun token disponibile");
      return [];
    }

    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/models`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Trovati ${result.data?.length || 0} modelli`);
    return result.data || [];
  } catch (err) {
    console.error("❌ Errore in fetchVehicleModels:", err);
    return [];
  }
}

export async function createVehicleModel(
  tenantId: string, 
  brandId: string, 
  categoryId: string, 
  name: string
): Promise<VehicleModel> {
  console.log("🆕 Creazione nuovo modello:", { tenantId, brandId, categoryId, name });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/models`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ brand_id: brandId, category_id: categoryId, name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Errore ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Modello creato con ID:", result.data.id);
    return result.data;
  } catch (err) {
    console.error("❌ Errore in createVehicleModel:", err);
    throw err;
  }
}

export async function toggleVehicleModel(modelId: string, isActive: boolean): Promise<void> {
  console.log("🔄 Toggle modello:", { modelId, isActive });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const urlParts = window.location.pathname.split('/');
    const tenantId = urlParts[urlParts.indexOf('tenant') + 1];
    
    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/models/${modelId}/toggle`, {
      method: "PUT",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_active: isActive })
    });

    if (!response.ok) {
      throw new Error(`Errore ${response.status}`);
    }

    console.log("✅ Toggle completato");
  } catch (err) {
    console.error("❌ Errore in toggleVehicleModel:", err);
    throw err;
  }
}

// 🔥 NUOVA FUNZIONE: Aggiorna la categoria di un modello
export async function updateVehicleModelCategory(
  tenantId: string,
  modelId: string,
  categoryId: string
): Promise<void> {
  console.log("📝 Aggiornamento categoria modello:", { tenantId, modelId, categoryId });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/models/${modelId}/category`, {
      method: "PUT",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ category_id: categoryId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Errore ${response.status}`);
    }

    console.log("✅ Categoria modello aggiornata");
  } catch (err) {
    console.error("❌ Errore in updateVehicleModelCategory:", err);
    throw err;
  }
}