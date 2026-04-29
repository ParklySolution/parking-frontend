// src/services/vehicleCategoryService.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface VehicleCategory {
  id: string;
  global_category_id: string | null;
  name: string;
  is_active: boolean;
  is_custom: boolean;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetchVehicleCategories(tenantId: string): Promise<VehicleCategory[]> {
  console.log("🔍 fetchVehicleCategories chiamato con tenantId:", tenantId);
  
  try {
    const token = await getToken();
    if (!token) {
      console.error("❌ Nessun token disponibile");
      return [];
    }

    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Trovate ${result.data?.length || 0} categorie`);
    return result.data || [];
  } catch (err) {
    console.error("❌ Errore in fetchVehicleCategories:", err);
    return [];
  }
}

export async function createVehicleCategory(tenantId: string, name: string): Promise<VehicleCategory> {
  console.log("🆕 Creazione nuova categoria:", { tenantId, name });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/categories`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Errore ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Categoria creata con ID:", result.data.id);
    return result.data;
  } catch (err) {
    console.error("❌ Errore in createVehicleCategory:", err);
    throw err;
  }
}

export async function toggleVehicleCategory(categoryId: string, isActive: boolean): Promise<void> {
  console.log("🔄 Toggle categoria:", { categoryId, isActive });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const urlParts = window.location.pathname.split('/');
    const tenantId = urlParts[urlParts.indexOf('tenant') + 1];
    
    const response = await fetch(`${API_URL}/api/tenant/${tenantId}/categories/${categoryId}/toggle`, {
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
    console.error("❌ Errore in toggleVehicleCategory:", err);
    throw err;
  }
}

// ============================================================================
// ALIAS per compatibilità con i file esistenti
// ============================================================================
export const getVehicleCategories = fetchVehicleCategories;