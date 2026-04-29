// src/services/globalBrandsService.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface GlobalBrand {
  id: string;
  name: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetchGlobalBrands(): Promise<GlobalBrand[]> {
  console.log("🔍 fetchGlobalBrands chiamato");
  
  try {
    const token = await getToken();
    if (!token) {
      console.error("❌ Nessun token disponibile");
      return [];
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-brands`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Trovate ${result.data?.length || 0} marche globali`);
    return result.data || [];
  } catch (err) {
    console.error("❌ Errore in fetchGlobalBrands:", err);
    return [];
  }
}

export async function createGlobalBrand(name: string, order?: number): Promise<GlobalBrand> {
  console.log("🆕 Creazione marca globale:", { name, order });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-brands`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, order: order || 0 })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Errore ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Marca globale creata:", result.data.id);
    return result.data;
  } catch (err) {
    console.error("❌ Errore in createGlobalBrand:", err);
    throw err;
  }
}

export async function updateGlobalBrand(id: string, updates: Partial<GlobalBrand>): Promise<void> {
  console.log("📝 Aggiornamento marca globale:", { id, updates });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-brands/${id}`, {
      method: "PUT",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Errore ${response.status}`);
    }

    console.log("✅ Marca globale aggiornata");
  } catch (err) {
    console.error("❌ Errore in updateGlobalBrand:", err);
    throw err;
  }
}

export async function deleteGlobalBrand(id: string): Promise<void> {
  console.log("🗑️ Eliminazione marca globale:", id);
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-brands/${id}`, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Errore ${response.status}`);
    }

    console.log("✅ Marca globale eliminata");
  } catch (err) {
    console.error("❌ Errore in deleteGlobalBrand:", err);
    throw err;
  }
}