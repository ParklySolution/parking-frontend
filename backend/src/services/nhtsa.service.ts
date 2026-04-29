// backend/src/services/nhtsa.service.ts

const NHTSA_API_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

export interface NhtsaModel {
  Model_ID: number;
  Model_Name: string;
}

export interface NhtsaResponse {
  Count: number;
  Message: string;
  Results: NhtsaModel[];
}

/**
 * Recupera i modelli per una marca specifica dall'API NHTSA
 */
export async function fetchModelsFromNhtsa(brandName: string): Promise<NhtsaModel[]> {
  const url = `${NHTSA_API_BASE}/GetModelsForMake/${encodeURIComponent(brandName)}?format=json`;
  
  console.log(`🌐 [NHTSA] Richiesta modelli per marca: ${brandName}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: NhtsaResponse = await response.json();
    
    console.log(`✅ [NHTSA] Trovati ${data.Count} modelli per ${brandName}`);
    
    return data.Results || [];
  } catch (error) {
    console.error(`❌ [NHTSA] Errore per ${brandName}:`, error);
    return [];
  }
}

/**
 * Sincronizza i modelli globali con l'API NHTSA per una marca specifica
 */
export async function syncModelsForBrand(brandId: string, brandName: string, supabase: any) {
  console.log(`🔄 [Sync] Sincronizzazione modelli per: ${brandName}`);
  
  const models = await fetchModelsFromNhtsa(brandName);
  
  if (models.length === 0) {
    console.log(`⚠️ [Sync] Nessun modello trovato per ${brandName}`);
    return 0;
  }
  
  let insertedCount = 0;
  
  for (const model of models) {
    // Verifica se il modello esiste già
    const { data: existing } = await supabase
      .from("global_vehicle_models")
      .select("id")
      .eq("brand_id", brandId)
      .eq("name", model.Model_Name)
      .maybeSingle();
    
    if (!existing) {
      // Inserisce il nuovo modello
      const { error } = await supabase
        .from("global_vehicle_models")
        .insert({
          brand_id: brandId,
          name: model.Model_Name,
          is_active: true
        });
      
      if (error) {
        console.error(`❌ [Sync] Errore inserimento modello ${model.Model_Name}:`, error);
      } else {
        insertedCount++;
      }
    }
  }
  
  console.log(`✅ [Sync] Inseriti ${insertedCount} nuovi modelli per ${brandName}`);
  return insertedCount;
}

/**
 * Sincronizza tutti i modelli globali per tutte le marche
 */
export async function syncAllModels(supabase: any): Promise<{ total: number; brands: number }> {
  console.log(`🔄 [Sync] Avvio sincronizzazione completa modelli...`);
  
  // Recupera tutte le marche globali attive
  const { data: brands, error } = await supabase
    .from("global_vehicle_brands")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  
  if (error) {
    console.error("❌ [Sync] Errore recupero marche:", error);
    throw error;
  }
  
  console.log(`📋 [Sync] Trovate ${brands.length} marche da sincronizzare`);
  
  let totalInserted = 0;
  
  for (const brand of brands) {
    const inserted = await syncModelsForBrand(brand.id, brand.name, supabase);
    totalInserted += inserted;
  }
  
  console.log(`🎉 [Sync] Sincronizzazione completata! Inseriti ${totalInserted} nuovi modelli totali.`);
  
  return { total: totalInserted, brands: brands.length };
}