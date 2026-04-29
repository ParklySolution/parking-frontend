// src/services/globalCategoriesService.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface GlobalCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetchGlobalCategories(): Promise<GlobalCategory[]> {
  console.log("🔍 fetchGlobalCategories chiamato");
  
  try {
    const token = await getToken();
    if (!token) {
      console.error("❌ Nessun token disponibile");
      return [];
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Trovate ${result.data?.length || 0} categorie globali`);
    return result.data || [];
  } catch (err) {
    console.error("❌ Errore in fetchGlobalCategories:", err);
    return [];
  }
}

export async function createGlobalCategory(name: string): Promise<GlobalCategory> {
  console.log("🆕 Creazione categoria globale:", { name });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-categories`, {
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
    console.log("✅ Categoria globale creata:", result.data.id);
    return result.data;
  } catch (err) {
    console.error("❌ Errore in createGlobalCategory:", err);
    throw err;
  }
}

export async function updateGlobalCategory(id: string, updates: Partial<GlobalCategory>): Promise<void> {
  console.log("📝 Aggiornamento categoria globale:", { id, updates });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-categories/${id}`, {
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

    console.log("✅ Categoria globale aggiornata");
  } catch (err) {
    console.error("❌ Errore in updateGlobalCategory:", err);
    throw err;
  }
}

export async function deleteGlobalCategory(id: string): Promise<void> {
  console.log("🗑️ Eliminazione categoria globale:", id);
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-categories/${id}`, {
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

    console.log("✅ Categoria globale eliminata");
  } catch (err) {
    console.error("❌ Errore in deleteGlobalCategory:", err);
    throw err;
  }
}