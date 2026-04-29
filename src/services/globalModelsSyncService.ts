// src/services/globalModelsSyncService.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    brands_processed?: number;
    new_models_added?: number;
    brand_id?: string;
    brand_name?: string;
  };
}

export async function syncAllGlobalModels(): Promise<SyncResult> {
  console.log("🔄 [Sync] Avvio sincronizzazione tutti i modelli...");
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }
    
    const response = await fetch(`${API_URL}/api/superadmin/global-models/sync-all`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Errore ${response.status}`);
    }
    
    console.log("✅ [Sync] Sincronizzazione completata:", result);
    return result;
    
  } catch (err) {
    console.error("❌ [Sync] Errore sincronizzazione:", err);
    throw err;
  }
}

export async function syncBrandModels(brandId: string): Promise<SyncResult> {
  console.log(`🔄 [Sync] Avvio sincronizzazione modelli per brand: ${brandId}`);
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }
    
    const response = await fetch(`${API_URL}/api/superadmin/global-models/sync-brand/${brandId}`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Errore ${response.status}`);
    }
    
    console.log(`✅ [Sync] Sincronizzazione brand completata:`, result);
    return result;
    
  } catch (err) {
    console.error("❌ [Sync] Errore sincronizzazione brand:", err);
    throw err;
  }
}