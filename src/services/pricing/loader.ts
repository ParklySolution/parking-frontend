// src/services/pricing/loader.ts

import { supabase } from "@/services/supabase";
import type { TariffaCompleta, ParkingTolerance } from "./types";

/**
 * Carica le tolleranze di parcheggio per un tenant
 */
export async function loadParkingTolerance(
  tenantId: string
): Promise<ParkingTolerance | null> {
  const { data } = await supabase
    .from("parking_tolerances")
    .select("initial_free_minutes, post_hour_tolerance_minutes")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data || null;
}

/**
 * Carica tutte le regole di prezzo per una categoria
 */
export async function loadPriceRules(
  tenantId: string,
  categoryId: string
): Promise<TariffaCompleta | null> {
  console.log("🔍 [pricing/loader] Caricamento regole per categoria:", categoryId);
  
  try {
    // 1. Trova listino attivo
    const { data: activeList, error: listError } = await supabase
      .from('price_lists')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (listError) {
      console.error("❌ Errore query listino:", listError);
      return null;
    }

    if (!activeList) {
      console.warn('⚠️ Nessun listino attivo trovato');
      return null;
    }

    // 2. Carica tolleranze
    const tolleranze = await loadParkingTolerance(tenantId);

    // 3. Carica regole
    const { data: rules, error: rulesError } = await supabase
      .from('price_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('price_list_id', activeList.id)
      .eq('category_id', categoryId);

    if (rulesError) {
      console.error("❌ Errore query regole:", rulesError);
      return null;
    }

    if (!rules || rules.length === 0) {
      console.warn('⚠️ Nessuna regola trovata per categoria:', categoryId);
      return null;
    }

    console.log(`📊 Trovate ${rules.length} regole`);

    // 4. Costruisci oggetto tariffa con valori di default
    const tariffa: TariffaCompleta = {
      priceListId: activeList.id,
      nightStartHour: 20,  // default: 20:00
      nightEndHour: 8,     // default: 08:00
      tolleranze: tolleranze || undefined
    };

    // 5. Mappa le regole
    for (const rule of rules) {
      switch (rule.rule_type) {
        case 'first_hour':
          tariffa.firstHour = rule.first_hour_price || rule.value;
          console.log("✅ first_hour:", tariffa.firstHour);
          break;
        case 'next_hours':
          tariffa.nextHours = rule.next_hours_price || rule.value;
          console.log("✅ next_hours:", tariffa.nextHours);
          break;
        case 'hourly':
          tariffa.hourly = rule.value;
          console.log("✅ hourly:", tariffa.hourly);
          break;
        case 'daily_cap':
          tariffa.dailyCap = rule.value;
          console.log("✅ daily_cap:", tariffa.dailyCap);
          break;
        case 'day_max':
          tariffa.dayMax = rule.value;
          console.log("✅ day_max:", tariffa.dayMax);
          break;
        case 'night_hourly':
          tariffa.nightHourly = rule.value;
          console.log("✅ night_hourly:", tariffa.nightHourly);
          break;
        case 'night_max':
          tariffa.nightMax = rule.value;
          console.log("✅ night_max:", tariffa.nightMax);
          break;
        case 'night_start_hour':
          tariffa.nightStartHour = rule.value;
          console.log("✅ night_start_hour:", tariffa.nightStartHour);
          break;
        case 'night_end_hour':
          tariffa.nightEndHour = rule.value;
          console.log("✅ night_end_hour:", tariffa.nightEndHour);
          break;
        case 'overnight_14_12':
          tariffa.overnight14_12 = rule.value;
          console.log("✅ overnight_14_12:", tariffa.overnight14_12);
          break;
        case 'overnight_24h':
          tariffa.overnight24h = rule.value;
          console.log("✅ overnight_24h:", tariffa.overnight24h);
          break;
        case 'overnight_fixed': // retrocompatibilità
          tariffa.overnight24h = rule.value;
          console.log("✅ overnight_fixed (mappato a 24h):", tariffa.overnight24h);
          break;
      }
    }

    console.log('🎯 Tariffa completa caricata:', tariffa);
    return tariffa;

  } catch (error) {
    console.error('❌ Errore caricamento tariffa:', error);
    return null;
  }
}

/**
 * Versione cacheable per performance (da implementare dopo)
 */
export async function loadPriceRulesCached(
  tenantId: string,
  categoryId: string
): Promise<TariffaCompleta | null> {
  // TODO: implementare cache con Redis o memoria
  return loadPriceRules(tenantId, categoryId);
}