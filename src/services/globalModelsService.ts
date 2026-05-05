// src/services/globalModelsService.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface GlobalModel {
  id: string;
  brand_id: string;
  brand_name?: string;
  name: string;
  default_category_id: string;
  category_name?: string;
  is_active: boolean;
  created_at: string;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetchGlobalModels(): Promise<GlobalModel[]> {
  console.log("🔍 fetchGlobalModels chiamato");
  
  try {
    const token = await getToken();
    if (!token) {
      console.error("❌ Nessun token disponibile");
      return [];
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-models`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Trovati ${result.data?.length || 0} modelli globali`);
    return result.data || [];
  } catch (err) {
    console.error("❌ Errore in fetchGlobalModels:", err);
    return [];
  }
}

export async function updateGlobalModelCategory(modelId: string, categoryId: string): Promise<void> {
  console.log("📝 Aggiornamento categoria modello globale:", { modelId, categoryId });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-models/${modelId}/category`, {
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

    console.log("✅ Categoria modello globale aggiornata");
  } catch (err) {
    console.error("❌ Errore in updateGlobalModelCategory:", err);
    throw err;
  }
}

export async function toggleGlobalModel(modelId: string, isActive: boolean): Promise<void> {
  console.log("🔄 Toggle modello globale:", { modelId, isActive });
  
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Nessun token disponibile");
    }

    const response = await fetch(`${API_URL}/api/superadmin/global-models/${modelId}/toggle`, {
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
    console.error("❌ Errore in toggleGlobalModel:", err);
    throw err;
  }
}

export async function importGlobalModelsFromCSV(file: File): Promise<any> {
  console.log("📤 Importazione modelli da CSV");
  
  const formData = new FormData();
  formData.append("file", file);

  const token = await getToken();
  const response = await fetch(`${API_URL}/api/superadmin/global-models/import-csv`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Errore ${response.status}`);
  }

  const result = await response.json();
  console.log(`✅ Import completato: ${result.data.imported} modelli aggiunti`);
  return result;
}

export async function exportGlobalModelsToCSV(): Promise<void> {
  console.log("📥 Esportazione modelli in CSV");
  
  const token = await getToken();
  const response = await fetch(`${API_URL}/api/superadmin/global-models/export-csv`, {
    method: "GET",
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Errore ${response.status}`);
  }

  // Scarica il file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'global_models_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  console.log("✅ Esportazione completata");
}