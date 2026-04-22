// src/services/pricingService.ts
import { supabase } from "@/services/supabase";

/* ---------------------------------------------
   TIPI
---------------------------------------------- */
export interface TariffValues {
  // Tariffe base
  first_hour?: number;      // Prima ora
  next_hours?: number;      // Ore successive
  hourly?: number;          // Tariffa unica (alternativa)
  
  // Fascia notturna (20-8 FISSA)
  night_hourly?: number;    // Tariffa notturna
  
  // Massimali
  day_max?: number;         // Massimo giornaliero diurno
  night_max?: number;       // Massimo giornaliero notturno
  
  // Pernottamento (solo 24h)
  overnight_24h?: number;   // Tariffa fissa 24 ore
}

// NOTA: I valori night_start=20 e night_end=8 sono HARDCODED nel sistema
export const NIGHT_START_HOUR = 20;
export const NIGHT_END_HOUR = 8;


export interface TariffaCompleta {
  priceListId: string;
  firstHour?: number;
  nextHours?: number;
  hourly?: number;
  nightStartHour: number;
  nightEndHour: number;
  nightHourly?: number;
  dayMax?: number;
  nightMax?: number;
  overnight14_12?: number;
  overnight24h?: number;
}

/* ---------------------------------------------
   FETCH TARIFFE PER LISTINO
---------------------------------------------- */
export async function fetchTariffsForPriceList(priceListId: string) {
  const { data, error } = await supabase
    .from("price_rules")
    .select("*")
    .eq("price_list_id", priceListId);

  if (error) {
    console.error("❌ Errore fetchTariffsForPriceList:", error);
    throw error;
  }

  return data;
}

/* ---------------------------------------------
   OTTIENE DEFAULTS DAL TENANT
---------------------------------------------- */
export async function getPriceListDefaults(tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('pricing_defaults')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ Errore recupero tenant_settings:', error);
    }

    return data?.pricing_defaults || {
      nightStartHour: 20,
      nightEndHour: 8
    };
  } catch (error) {
    console.warn('⚠️ Errore getPriceListDefaults, uso default:', error);
    return {
      nightStartHour: 20,
      nightEndHour: 8
    };
  }
}

/* ---------------------------------------------
   VALIDA TARIFFE PRIMA DEL SALVATAGGIO
---------------------------------------------- */
export function validateTariff(values: TariffValues, defaults: { nightStartHour: number; nightEndHour: number }): string | null {
  // Controllo primo ora > ore successive (se entrambe presenti)
  if (values.first_hour && values.next_hours && values.first_hour < values.next_hours) {
    return "La prima ora dovrebbe essere maggiore o uguale alle ore successive";
  }
  
  // Controllo fasce notturne coerenti
  const nightStart = values.night_start_hour ?? defaults.nightStartHour;
  const nightEnd = values.night_end_hour ?? defaults.nightEndHour;
  
  if (nightStart === nightEnd) {
    return "Inizio e fine notte non possono coincidere";
  }
  
  // Controllo massimali
  if (values.day_max && values.day_max < (values.first_hour || values.hourly || 0)) {
    return "Il massimo diurno non può essere inferiore alla tariffa oraria";
  }
  
  if (values.night_max && values.night_max < (values.night_hourly || 0)) {
    return "Il massimo notturno non può essere inferiore alla tariffa oraria notturna";
  }
  
  // Controllo overnight
  if (values.overnight_14_12 && values.overnight_14_12 < 0) {
    return "La tariffa pernottamento 14-12 non può essere negativa";
  }
  
  if (values.overnight_24h && values.overnight_24h < 0) {
    return "La tariffa pernottamento 24h non può essere negativa";
  }
  
  return null;
}

/* ---------------------------------------------
   SIMULA PREZZO PER ANTEPRIMA
---------------------------------------------- */
export function simulatePrice(
  hours: number,
  tariffa: TariffValues,
  defaults: { nightStartHour: number; nightEndHour: number }
): number {
  // Se non ci sono tariffe, ritorna 0
  if (!tariffa.first_hour && !tariffa.hourly) return 0;
  
  const firstHour = tariffa.first_hour || tariffa.hourly || 0;
  const nextHours = tariffa.next_hours || tariffa.hourly || 0;
  
  // Calcolo base
  if (hours <= 1) return firstHour;
  return firstHour + (hours - 1) * nextHours;
}

/* ---------------------------------------------
   UPSERT TARIFFA PER LISTINO - VERSIONE COMPLETA
---------------------------------------------- */
export async function upsertTariffForPriceList(
  priceListId: string,
  categoryId: string,
  values: TariffValues
) {
  try {
    console.log("=== UPSERT TARIFFE AGGIORNATO ===");
    console.log("priceListId:", priceListId);
    console.log("categoryId:", categoryId);
    console.log("values:", values);

    // Ottieni tenant ID
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

    // Ottieni defaults per validazione
    const defaults = await getPriceListDefaults(tenantId);

    // Valida prima del salvataggio
    const validationError = validateTariff(values, defaults);
    if (validationError) {
      throw new Error(validationError);
    }

    const operations: any[] = [];
    const basePayload = {
      tenant_id: tenantId,
      price_list_id: priceListId,
      category_id: categoryId,
      created_at: new Date().toISOString()
    };

    // Mappa i campi ai rule_type
    if (values.hourly !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "hourly", 
        value: values.hourly 
      });
    }
    
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
    
    if (values.night_start_hour !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "night_start_hour", 
        value: values.night_start_hour 
      });
    }
    
    if (values.night_end_hour !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "night_end_hour", 
        value: values.night_end_hour 
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
    
    if (values.night_max !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "night_max", 
        value: values.night_max 
      });
    }
    
    if (values.overnight_14_12 !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "overnight_14_12", 
        value: values.overnight_14_12 
      });
    }
    
    if (values.overnight_24h !== undefined) {
      operations.push({ 
        ...basePayload, 
        rule_type: "overnight_24h", 
        value: values.overnight_24h 
      });
    }

    console.log(`📦 Operazioni da eseguire: ${operations.length}`);

    if (operations.length > 0) {
      const { error } = await supabase
        .from("price_rules")
        .upsert(operations, {
          onConflict: "price_list_id, category_id, rule_type"
        });

      if (error) {
        console.error("❌ Errore operazione DB:", error);
        throw error;
      }
    }

    console.log("✅ Tariffe aggiornate con successo");
    return true;

  } catch (err: any) {
    console.error("❌ Errore upsertTariffForPriceList:", err);
    throw err;
  }
}

/* ---------------------------------------------
   RECUPERA TARIFFA COMPLETA PER CATEGORIA
---------------------------------------------- */
export async function getTariffaCompleta(
  tenantId: string,
  categoryId: string
): Promise<TariffaCompleta | null> {
  try {
    console.log("🔍 Cerco tariffa completa per categoria:", categoryId);
    
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

    // Ottieni defaults del tenant
    const defaults = await getPriceListDefaults(tenantId);

    const { data: rules } = await supabase
      .from('price_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('price_list_id', activeList.id)
      .eq('category_id', categoryId);

    if (!rules || rules.length === 0) {
      console.warn('⚠️ Nessuna regola trovata per categoria:', categoryId);
      return null;
    }

    const tariffa: TariffaCompleta = {
      priceListId: activeList.id,
      nightStartHour: defaults.nightStartHour,
      nightEndHour: defaults.nightEndHour,
    };

    for (const rule of rules) {
      switch (rule.rule_type) {
        case 'first_hour':
          tariffa.firstHour = rule.first_hour_price || rule.value || 0;
          console.log(`✅ firstHour: ${tariffa.firstHour}`);
          break;
        case 'next_hours':
          tariffa.nextHours = rule.next_hours_price || rule.value || 0;
          console.log(`✅ nextHours: ${tariffa.nextHours}`);
          break;
        case 'hourly':
          tariffa.hourly = rule.value || 0;
          console.log(`✅ hourly: ${tariffa.hourly}`);
          break;
        case 'night_start_hour':
          tariffa.nightStartHour = rule.value || defaults.nightStartHour;
          console.log(`✅ nightStartHour: ${tariffa.nightStartHour}`);
          break;
        case 'night_end_hour':
          tariffa.nightEndHour = rule.value || defaults.nightEndHour;
          console.log(`✅ nightEndHour: ${tariffa.nightEndHour}`);
          break;
        case 'night_hourly':
          tariffa.nightHourly = rule.value || 0;
          console.log(`✅ nightHourly: ${tariffa.nightHourly}`);
          break;
        case 'day_max':
          tariffa.dayMax = rule.value || 0;
          console.log(`✅ dayMax: ${tariffa.dayMax}`);
          break;
        case 'night_max':
          tariffa.nightMax = rule.value || 0;
          console.log(`✅ nightMax: ${tariffa.nightMax}`);
          break;
        case 'overnight_14_12':
          tariffa.overnight14_12 = rule.value || 0;
          console.log(`✅ overnight14_12: ${tariffa.overnight14_12}`);
          break;
        case 'overnight_24h':
          tariffa.overnight24h = rule.value || 0;
          console.log(`✅ overnight24h: ${tariffa.overnight24h}`);
          break;
      }
    }

    console.log('🎯 Tariffa completa:', tariffa);
    return tariffa;

  } catch (error) {
    console.error('❌ Errore recupero tariffa:', error);
    return null;
  }
}

/* ---------------------------------------------
   RECUPERA TUTTI I TIPI DI REGOLE DISPONIBILI
---------------------------------------------- */
export async function getAvailableRuleTypes(tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('price_rules')
      .select('rule_type')
      .eq('tenant_id', tenantId)
      .limit(100);

    if (error) throw error;

    // Estrai tipi unici
    const uniqueTypes = [...new Set(data.map(r => r.rule_type))];
    return uniqueTypes;
  } catch (error) {
    console.error('❌ Errore getAvailableRuleTypes:', error);
    return [];
  }
}

/* ---------------------------------------------
   ELIMINA TARIFFA
---------------------------------------------- */
export async function deleteTariff(
  priceListId: string,
  categoryId: string,
  ruleType: string
) {
  try {
    const { error } = await supabase
      .from("price_rules")
      .delete()
      .eq("price_list_id", priceListId)
      .eq("category_id", categoryId)
      .eq("rule_type", ruleType);

    if (error) throw error;
    console.log(`✅ Tariffa ${ruleType} eliminata`);
    return true;
  } catch (err: any) {
    console.error("❌ Errore deleteTariff:", err);
    throw err;
  }
}