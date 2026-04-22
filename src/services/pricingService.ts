// src/services/pricingService.ts
import { supabase } from "./supabase";

export interface TariffaBase {
  // Tariffe base (si applicano a tutte le ore)
  first_hour?: number;      // Prima ora
  next_hours?: number;      // Ore successive
  hourly?: number;          // Tariffa unica (alternativa)
  
  // Tariffa notturna (opzionale, se diversa da quella diurna)
  night_hourly?: number;    // Tariffa oraria notturna (20-8)
  
  // Massimo diurno (solo per fascia 8-20)
  day_max?: number;         // Massimo per le ore in fascia diurna
  
  // Pernottamento 24h
  overnight_24h?: number;   // Tariffa fissa per 24 ore
  
  // Metadati
  price_list_id: string;
  category_id: string;
}

/**
 * RECUPERA LA TARIFFA BASE PER UNA CATEGORIA
 */
export async function getTariffaBase(
  tenantId: string,
  categoryId: string
): Promise<TariffaBase | null> {
  try {
    console.log("🔍 Cerco tariffa base per categoria:", categoryId);
    
    // Trova listino attivo
    const { data: activeList } = await supabase
      .from('price_lists')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (!activeList) {
      console.warn('⚠️ Nessun listino attivo trovato');
      return null;
    }

    console.log("✅ Listino attivo:", activeList.id);

    // Cerca regole per questa categoria
    const { data: rules } = await supabase
      .from('price_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('price_list_id', activeList.id)
      .eq('category_id', categoryId);

    if (!rules || rules.length === 0) {
      console.warn('⚠️ Nessuna regola trovata');
      return null;
    }

    const tariffa: TariffaBase = {
      price_list_id: activeList.id,
      category_id: categoryId
    };

    for (const rule of rules) {
      switch (rule.rule_type) {
        case 'first_hour':
          tariffa.first_hour = rule.first_hour_price || rule.value;
          console.log("✅ first_hour:", tariffa.first_hour);
          break;
        case 'next_hours':
          tariffa.next_hours = rule.next_hours_price || rule.value;
          console.log("✅ next_hours:", tariffa.next_hours);
          break;
        case 'hourly':
          tariffa.hourly = rule.value;
          console.log("✅ hourly:", tariffa.hourly);
          break;
        case 'night_hourly':
          tariffa.night_hourly = rule.value;
          console.log("✅ night_hourly:", tariffa.night_hourly);
          break;
        case 'day_max':
          tariffa.day_max = rule.value;
          console.log("✅ day_max:", tariffa.day_max);
          break;
        case 'overnight_24h':
          tariffa.overnight_24h = rule.value;
          console.log("✅ overnight_24h:", tariffa.overnight_24h);
          break;
        default:
          console.log(`ℹ️ Ignorato tipo ${rule.rule_type}`);
      }
    }

    return tariffa;

  } catch (error) {
    console.error('❌ Errore recupero tariffa:', error);
    return null;
  }
}

/**
 * ALIAS PER COMPATIBILITÀ CON IL VECCHIO CODICE
 * Restituisce la tariffa base con la stessa interfaccia di getTariffaBase
 */
export async function getTariffaCompleta(
  tenantId: string,
  categoryId: string
): Promise<TariffaBase | null> {
  console.log("🔍 getTariffaCompleta chiamato (alias per getTariffaBase)");
  return getTariffaBase(tenantId, categoryId);
}

/**
 * SALVA LA TARIFFA BASE PER UNA CATEGORIA
 */
export async function saveTariffaBase(
  priceListId: string,
  categoryId: string,
  values: {
    first_hour?: number;
    next_hours?: number;
    hourly?: number;
    night_hourly?: number;
    day_max?: number;
    overnight_24h?: number;
  }
) {
  try {
    console.log("💾 Salvataggio tariffa base:", { priceListId, categoryId, values });

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Utente non autenticato");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Tenant ID non trovato");
    const tenantId = profile.tenant_id;

    const operations: any[] = [];
    const basePayload = {
      tenant_id: tenantId,
      price_list_id: priceListId,
      category_id: categoryId,
      created_at: new Date().toISOString()
    };

    if (values.first_hour !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "first_hour", 
        first_hour_price: values.first_hour 
      });
    }
    
    if (values.next_hours !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "next_hours", 
        next_hours_price: values.next_hours 
      });
    }
    
    if (values.hourly !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "hourly", 
        value: values.hourly 
      });
    }
    
    if (values.night_hourly !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "night_hourly", 
        value: values.night_hourly 
      });
    }
    
    if (values.day_max !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "day_max", 
        value: values.day_max 
      });
    }
    
    if (values.overnight_24h !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "overnight_24h", 
        value: values.overnight_24h 
      });
    }

    if (operations.length > 0) {
      const { error } = await supabase
        .from("price_rules")
        .upsert(operations, {
          onConflict: "price_list_id, category_id, rule_type"
        });

      if (error) throw error;
    }

    console.log("✅ Tariffa base salvata");
    return true;

  } catch (err) {
    console.error("❌ Errore salvataggio tariffa:", err);
    throw err;
  }
}

/**
 * Funzione per ottenere la tariffa base con una struttura più semplice
 * Utile per il calcolo veloce in alcune parti dell'app
 */
export async function getTariffaSemplificata(
  tenantId: string,
  categoryId: string
): Promise<{ 
  firstHour?: number; 
  nextHours?: number; 
  hourly?: number; 
  nightHourly?: number;
  dayMax?: number;
  overnight24h?: number;
} | null> {
  const tariffa = await getTariffaBase(tenantId, categoryId);
  
  if (!tariffa) return null;
  
  return {
    firstHour: tariffa.first_hour,
    nextHours: tariffa.next_hours,
    hourly: tariffa.hourly,
    nightHourly: tariffa.night_hourly,
    dayMax: tariffa.day_max,
    overnight24h: tariffa.overnight_24h
  };
}