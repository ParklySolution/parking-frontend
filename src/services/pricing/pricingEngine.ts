// src/services/pricing/pricingEngine.ts
import { supabase } from "@/services/supabase";
import type { 
  WashServiceSelection,
  WashPriceCalculation,
  WashServicePriceUI 
} from "@/types/vehicleProfile";

/* ======================================================
   COSTANTI FISSE PER LE FASCE ORARIE
   ====================================================== */
const DAY_START = 8;  // 08:00
const DAY_END = 20;   // 20:00
const NIGHT_START = 20;
const NIGHT_END = 8;

/* ======================================================
   MODELLI BASE
   ====================================================== */
export interface BaseTariffInfo {
  firstHour?: number;
  hourly?: number;
  dailyCap?: number;
}

export interface ParkingTolerance {
  initial_free_minutes: number;
  post_hour_tolerance_minutes: number;
}

export interface TariffaCompleta {
  firstHour: number;
  nextHours: number;
  hourly?: number;
  maxDaily?: number;
  nightHourly?: number;      // Tariffa oraria notturna (20-8)
  dayMax?: number;           // Massimo diurno (solo fascia 8-20)
  overnight24h?: number;     // Tariffa fissa 24h
  priceListId: string;
}

/* ======================================================
   MODELLI PER PULSANTI USCITA
   ====================================================== */
export interface ExitButton {
  id: string;
  label: string;
  button_type: 'overnight' | 'hourly' | 'discount' | 'fixed';
  amount: number;
  is_active: boolean;
}

export interface CalculateParams {
  tenantId: string;
  session: any;
  overrideId?: string | null;
  additionalButtonIds?: string[];
  // ⭐ AGGIUNGI: lookupResult per verificare abbonamento
  lookupResult?: {
    subscription?: {
      id: string;
      type: string;
      is_active: boolean;
    } | null;
  } | null;
}

export interface PriceResult {
  amount: number;
  type: 'automatic' | 'override' | 'mixed' | 'subscription';
  breakdown: {
    baseAmount?: number;
    overrides?: Array<{
      label: string;
      amount: number;
    }>;
    isSubscription?: boolean;
  };
}

/* ======================================================
   FETCH TOLLERANZE
   ====================================================== */
async function fetchParkingTolerance(
  tenantId: string
): Promise<ParkingTolerance | null> {
  const { data } = await supabase
    .from("parking_tolerances")
    .select("initial_free_minutes, post_hour_tolerance_minutes")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data || null;
}

/* ======================================================
   CALCOLO TARIFFA BASE
   ====================================================== */
export async function calculateBaseTariff(
  tenantId: string,
  categoryId: string
): Promise<BaseTariffInfo | null> {
  console.log("🔍 Cerco listino attivo per tenant:", tenantId);
  
  const { data: activeList, error: listError } = await supabase
    .from("price_lists")
    .select("id, name, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  console.log("📊 Risultato query listini:", { activeList, listError });

  if (listError) {
    console.error("❌ Errore query listini:", listError);
    return null;
  }

  if (!activeList) {
    console.log("❌ Nessun listino attivo trovato");
    return null;
  }

  console.log("✅ Listino attivo trovato:", activeList);

  const { data, error } = await supabase
    .from("price_rules")
    .select("rule_type, value, first_hour_price, next_hours_price")
    .eq("price_list_id", activeList.id)
    .eq("category_id", categoryId);

  if (error) {
    console.error("Errore lettura price_rules:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log("Nessuna regola trovata per categoria:", categoryId);
    return null;
  }

  console.log("Regole trovate:", data);

  const result: BaseTariffInfo = {};

  for (const rule of data) {
    if (rule.rule_type === "first_hour") {
      result.firstHour = Number(rule.first_hour_price);
      console.log("✅ Prima ora:", result.firstHour);
    }
    if (rule.rule_type === "next_hours") {
      result.hourly = Number(rule.next_hours_price);
      console.log("✅ Ore successive:", result.hourly);
    }
    if (rule.rule_type === "daily_cap") {
      result.dailyCap = Number(rule.value);
      console.log("✅ Massimale:", result.dailyCap);
    }
  }

  return result;
}

/* ======================================================
   OTTIENE TARIFFA COMPLETA (CON MASSIMALE E NOTTURNA)
   ====================================================== */
export async function getTariffaCompleta(
  tenantId: string,
  categoryId: string
): Promise<TariffaCompleta | null> {
  try {
    console.log("🔍 Cerco tariffa completa per categoria:", categoryId);
    
    // Prima trova il price list attivo
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

    console.log("✅ Listino attivo trovato:", activeList.id);

    // Cerca le regole per questa categoria
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

    // LOG DETTAGLIATO: mostra tutte le regole trovate
    console.log('📊 REGOLE TROVATE:', rules.map(r => ({
      type: r.rule_type,
      value: r.value,
      first_hour_price: r.first_hour_price,
      next_hours_price: r.next_hours_price
    })));

    // Inizializza con valori di default
    const tariffa: TariffaCompleta = {
      firstHour: 0,
      nextHours: 0,
      priceListId: activeList.id
    };

    // Estrai i valori dalle regole
    for (const rule of rules) {
      switch (rule.rule_type) {
        case 'first_hour':
          tariffa.firstHour = rule.first_hour_price || rule.value || 0;
          console.log("✅ first_hour:", tariffa.firstHour);
          break;
        case 'next_hours':
          tariffa.nextHours = rule.next_hours_price || rule.value || 0;
          console.log("✅ next_hours:", tariffa.nextHours);
          break;
        case 'hourly':
          tariffa.hourly = rule.value || 0;
          console.log("✅ hourly:", tariffa.hourly);
          break;
        case 'daily_cap':
          tariffa.maxDaily = rule.value || 0;
          console.log("✅ daily_cap:", tariffa.maxDaily);
          break;
        case 'night_hourly':
          tariffa.nightHourly = rule.value || 0;
          console.log("✅ night_hourly:", tariffa.nightHourly);
          break;
        case 'day_max':
          tariffa.dayMax = rule.value || 0;
          console.log("✅ day_max:", tariffa.dayMax);
          break;
        case 'overnight_24h':
          tariffa.overnight24h = rule.value || 0;
          console.log("✅ overnight_24h:", tariffa.overnight24h);
          break;
        case 'night': // Mantenuto per retrocompatibilità
          tariffa.nightHourly = rule.value || 0;
          console.log("✅ night (legacy):", tariffa.nightHourly);
          break;
        // Ignora i tipi legacy che non servono più
        case 'night_start_hour':
        case 'night_end_hour':
        case 'overnight_14_12':
        case 'overnight_fixed':
        case 'night_max':
          console.log(`ℹ️ Ignorato tipo legacy: ${rule.rule_type}`);
          break;
      }
    }

    console.log('🎯 Tariffa completa finale:', tariffa);
    return tariffa;

  } catch (error) {
    console.error('❌ Errore recupero tariffa:', error);
    return null;
  }
}

/* ======================================================
   CALCOLO IMPORTO PARCHEGGIO (ENTRY/EXIT)
   ====================================================== */
export async function calculateParkingAmount({
  tenantId,
  session,
  exitTime,
}: {
  tenantId: string;
  session: any;
  exitTime: Date;
}) {
  const entry = new Date(session.entry_time);
  const exit = new Date(exitTime);

  const tolerances = await fetchParkingTolerance(tenantId);
  const tariff = await calculateBaseTariff(tenantId, session.category_id);

  if (!tolerances || !tariff) {
    return { finalAmount: 0, breakdown: ["Tariffe o tolleranze mancanti"] };
  }

  const totalMinutes = Math.ceil((exit.getTime() - entry.getTime()) / 60000);

  let chargeableMinutes = totalMinutes - tolerances.initial_free_minutes;
  if (chargeableMinutes <= 0) {
    return { finalAmount: 0, breakdown: ["Coperto da minuti gratuiti"] };
  }

  let amount = 0;
  let remainingMinutes = chargeableMinutes;

  // Prima ora
  if (remainingMinutes <= 60 + tolerances.post_hour_tolerance_minutes) {
    amount += tariff.firstHour || 0;
  } else {
    amount += tariff.firstHour || 0;
    remainingMinutes -= 60;

    while (remainingMinutes > 0) {
      if (remainingMinutes <= tolerances.post_hour_tolerance_minutes) break;
      amount += tariff.hourly || 0;
      remainingMinutes -= 60;
    }
  }

  // Daily cap
  if (tariff.dailyCap && amount > tariff.dailyCap) {
    amount = tariff.dailyCap;
  }

  return {
    finalAmount: Number(amount.toFixed(2)),
    breakdown: [],
  };
}

/* ======================================================
   CALCOLO PREZZO PARCHEGGIO (ORE)
   ====================================================== */
export async function calculateParkingPrice(
  tenantId: string,
  categoryId: string,
  durationHours: number
) {
  const tariffInfo = await calculateBaseTariff(tenantId, categoryId);

  if (!tariffInfo || (tariffInfo.firstHour === undefined && tariffInfo.hourly === undefined)) {
    return {
      price: 0,
      tariffInfo: {},
      calculationDetails: {
        baseHours: durationHours,
        hourlyRate: 0,
        dailyCapApplied: false,
      },
    };
  }

  let total = 0;
  let remainingHours = durationHours;

  if (remainingHours > 0 && tariffInfo.firstHour !== undefined) {
    total += tariffInfo.firstHour;
    remainingHours -= 1;
  }

  if (remainingHours > 0 && tariffInfo.hourly !== undefined) {
    total += remainingHours * tariffInfo.hourly;
  }

  let dailyCapApplied = false;
  if (tariffInfo.dailyCap !== undefined && total > tariffInfo.dailyCap) {
    total = tariffInfo.dailyCap;
    dailyCapApplied = true;
  }

  return {
    price: Number(total.toFixed(2)),
    tariffInfo,
    calculationDetails: {
      baseHours: durationHours,
      hourlyRate: tariffInfo.hourly || 0,
      dailyCapApplied,
    },
  };
}

/* ======================================================
   CALCOLO PREZZI SERVIZI LAVAGGIO (VERSIONE AGGIORNATA)
   ====================================================== */
async function calculateWashServicesPrice(
  tenantId: string,
  washServices: WashServiceSelection[],
  vehicleCategoryId: string
): Promise<WashPriceCalculation[]> {
  if (washServices.length === 0) return [];

  const calculations: WashPriceCalculation[] = [];

  for (const service of washServices) {
    try {
      // Query semplice per i prezzi - usa washServiceId
      const { data: priceData, error: priceError } = await supabase
        .from("wash_service_prices")
        .select("price, duration_minutes, fidelity_points")
        .eq("tenant_id", tenantId)
        .eq("wash_service_id", service.washServiceId)
        .eq("vehicle_category_id", vehicleCategoryId)
        .maybeSingle();

      if (priceError || !priceData) {
        console.log(`⚠️ Nessun prezzo trovato per servizio ${service.washServiceId}`);
        continue;
      }

      // Query separata per i dettagli del servizio
      const { data: serviceData, error: serviceError } = await supabase
        .from("wash_service_catalog")
        .select("name, code, description")
        .eq("id", service.washServiceId)
        .maybeSingle();

      const quantity = service.quantity || 1;
      const basePrice = Number(priceData.price) * quantity;

      calculations.push({
        washServiceType: {
          id: service.washServiceId,
          code: serviceData?.code || "",
          name: serviceData?.name || "Servizio Lavaggio",
          description: serviceData?.description || null,
          baseDurationMinutes: priceData.duration_minutes || 0,
          isActive: true,
        },
        price: Number(priceData.price),
        durationMinutes: priceData.duration_minutes * quantity,
        fidelityPoints: priceData.fidelity_points * quantity,
        bonusHours: 0,
        bonusDiscount: 0,
        finalPrice: basePrice,
      });
    } catch (error) {
      console.error("❌ Errore calcolo prezzo servizio:", error);
    }
  }

  return calculations;
}

/* ======================================================
   CALCOLO ORE BONUS PARCHEGGIO DA SERVIZI LAVAGGIO (VERSIONE AGGIORNATA)
   ====================================================== */
export async function calculateParkingBonusFromWash(
  tenantId: string,
  categoryId: string,
  washServices: WashServiceSelection[]
): Promise<{
  totalBonusHours: number;
  bonusDetails: Array<{ serviceId: string; bonusHours: number; bonusType: string }>;
}> {
  if (washServices.length === 0) {
    return { totalBonusHours: 0, bonusDetails: [] };
  }

  const today = new Date().getDay(); // 0 = domenica, 1 = lunedì, ...
  const bonusDetails = [];
  let totalBonusHours = 0;

  for (const service of washServices) {
    try {
      // Cerca regole bonus attive per questo servizio - usa washServiceId
      const { data: rules, error } = await supabase
        .from("wash_parking_bonus_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("wash_service_id", service.washServiceId)
        .eq("is_active", true);

      if (error) throw error;
      if (!rules || rules.length === 0) continue;

      // Filtra regole applicabili
      for (const rule of rules) {
        // Filtra per categorie applicabili
        if (rule.applicable_categories && 
            rule.applicable_categories.length > 0 && 
            !rule.applicable_categories.includes(categoryId)) {
          continue;
        }

        // Filtra per giorni validi
        if (rule.valid_days_of_week && 
            rule.valid_days_of_week.length > 0 && 
            !rule.valid_days_of_week.includes(today)) {
          continue;
        }

        // Applica bonus in base al tipo
        let bonusHours = 0;
        
        switch (rule.bonus_type) {
          case 'free_hours':
            bonusHours = Number(rule.bonus_value);
            break;
          case 'free_parking':
            bonusHours = 24; // Intera giornata gratis
            break;
          case 'discount_percentage':
            // Non sono ore, ma percentuale - lo gestiamo dopo
            break;
          case 'fixed_discount':
            // Non sono ore, ma importo fisso - lo gestiamo dopo
            break;
        }

        if (bonusHours > 0) {
          totalBonusHours += bonusHours;
          bonusDetails.push({
            serviceId: service.washServiceId,
            bonusHours,
            bonusType: rule.bonus_type
          });
        }
      }
    } catch (error) {
      console.error("Errore calcolo bonus ore:", error);
    }
  }

  return { totalBonusHours, bonusDetails };
}

/* ======================================================
   CALCOLO PREZZO COMPLETO (PARCHEGGIO + LAVAGGI + BONUS)
   ====================================================== */
export async function calculatePriceWithWashBonus(
  tenantId: string,
  categoryId: string,
  durationHours: number,
  washServices: WashServiceSelection[] = []
) {
  // 1. Calcola prezzi lavaggi
  const washCalculations = await calculateWashServicesPrice(tenantId, washServices, categoryId);
  const washTotal = washCalculations.reduce((sum, w) => sum + w.finalPrice, 0);

  // 2. Se non ci sono servizi lavaggio, calcola solo parcheggio
  if (washServices.length === 0) {
    const parkingPrice = await calculateParkingPrice(tenantId, categoryId, durationHours);
    return {
      parkingPrice: parkingPrice.price,
      washTotal: 0,
      bonusHours: 0,
      bonusDiscount: 0,
      totalAmount: parkingPrice.price,
      washCalculations: [],
      calculationBreakdown: { 
        washBonusApplied: false,
        originalHours: durationHours,
        remainingHours: durationHours,
        bonusHours: 0
      }
    };
  }

  // 3. Calcola ore bonus dai servizi lavaggio
  const { totalBonusHours, bonusDetails } = await calculateParkingBonusFromWash(
    tenantId, 
    categoryId, 
    washServices
  );
  
  console.log("🎁 Bonus ore calcolati:", { totalBonusHours, bonusDetails });

  // 4. Applica bonus ore al parcheggio
  const remainingHours = Math.max(0, durationHours - totalBonusHours);
  const parkingPrice = await calculateParkingPrice(tenantId, categoryId, remainingHours);
  
  const totalAmount = parkingPrice.price + washTotal;

  return {
    parkingPrice: parkingPrice.price,
    washTotal,
    bonusHours: totalBonusHours,
    bonusDiscount: 0,
    totalAmount,
    washCalculations,
    calculationBreakdown: {
      washBonusApplied: totalBonusHours > 0,
      originalHours: durationHours,
      remainingHours,
      bonusHours: totalBonusHours,
      bonusDetails
    }
  };
}

/* ======================================================
   SERVIZI LAVAGGIO DISPONIBILI (VERSIONE OTTIMIZZATA)
   ====================================================== */
export async function getAvailableWashServices(
  tenantId: string,
  vehicleCategoryId: string
): Promise<WashServicePriceUI[]> {
  console.log("🔍 getAvailableWashServices chiamata con:", { tenantId, vehicleCategoryId });
  
  try {
    const { data: prices, error: pricesError } = await supabase
      .from("wash_service_prices")
      .select("id, price, duration_minutes, fidelity_points, wash_service_id")
      .eq("tenant_id", tenantId)
      .eq("vehicle_category_id", vehicleCategoryId);

    if (pricesError) throw pricesError;
    if (!prices || prices.length === 0) return [];

    const serviceIds = prices.map(p => p.wash_service_id);
    
    const { data: services, error: servicesError } = await supabase
      .from("wash_service_catalog")
      .select("id, name, code, description")
      .in("id", serviceIds);

    if (servicesError) throw servicesError;

    const servicesMap = new Map(services?.map(s => [s.id, s]));

    return prices.map(price => ({
      id: price.id,
      washServiceId: price.wash_service_id, // ⭐ MODIFICATO: ora usa washServiceId
      vehicleCategoryId,
      vehicleCategoryName: "",
      price: Number(price.price),
      durationMinutes: price.duration_minutes,
      fidelityPoints: price.fidelity_points,
      serviceName: servicesMap.get(price.wash_service_id)?.name || "Servizio",
      serviceCode: servicesMap.get(price.wash_service_id)?.code || "",
      serviceDescription: servicesMap.get(price.wash_service_id)?.description || "",
    }));
  } catch (error) {
    console.error("❌ Errore in getAvailableWashServices:", error);
    return [];
  }
}

/* ======================================================
   REGOLE BONUS LAVAGGIO (VERSIONE AGGIORNATA)
   ====================================================== */
export async function getWashBonusRules(
  tenantId: string,
  washServiceId?: string
) {
  let query = supabase
    .from("wash_parking_bonus_rules")
    .select(`
      id,
      bonus_type,
      bonus_value,
      min_wash_amount,
      applicable_categories,
      max_uses_per_day,
      valid_days_of_week,
      is_active
    `)
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (washServiceId) query = query.eq("wash_service_id", washServiceId);

  const { data } = await query;
  return data || [];
}

/* ======================================================
   GET EXIT BUTTONS (PULSANTI USCITA)
   ====================================================== */
export async function getExitButtons(tenantId: string): Promise<ExitButton[]> {
  try {
    const { data, error } = await supabase
      .from('exit_buttons')
      .select('id, label, button_type, amount, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Errore caricamento pulsanti uscita:', error);
    return [];
  }
}

/* ======================================================
   UTILITY: DETERMINA SE UN'ORA È IN FASCIA NOTTURNA
   ====================================================== */
const isNightHour = (hour: number): boolean => {
  return hour >= NIGHT_START || hour < NIGHT_END;
};

/* ======================================================
   UTILITY: DETERMINA SE UN'ORA È IN FASCIA DIURNA
   ====================================================== */
const isDayHour = (hour: number): boolean => {
  return hour >= DAY_START && hour < DAY_END;
};

/* ======================================================
   CALCOLO ORE SOSTA (HELPER)
   ====================================================== */
const calculateOreSosta = (dataIngresso: string | null | undefined): number => {
  if (!dataIngresso) return 0;
  
  const ingresso = new Date(dataIngresso);
  const now = new Date();
  const diffMs = now.getTime() - ingresso.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < 10) return 0;
  if (diffMinutes <= 60) return 1;
  
  const oreComplete = Math.floor(diffMinutes / 60);
  const minutiResidui = diffMinutes % 60;
  
  return minutiResidui > 10 ? oreComplete + 1 : oreComplete;
};

/* ======================================================
   CALCOLO GIORNI INTERI (HELPER)
   ====================================================== */
const calculateGiorniInteri = (oreSosta: number): number => {
  return Math.floor(oreSosta / 24);
};

/* ======================================================
   CALCOLA IL COSTO DI UN SEGMENTO ORARIO
   ====================================================== */
const calculateSegmentoOrario = (
  ore: number,
  isNotturna: boolean,
  tariffa: TariffaCompleta
): number => {
  if (ore === 0) return 0;
  
  // Determina la tariffa oraria da applicare
  const tariffaOraria = isNotturna && tariffa.nightHourly ? tariffa.nightHourly : (tariffa.hourly || tariffa.nextHours || 0);
  
  let totale = 0;
  
  if (ore <= 1) {
    // Prima ora
    totale = tariffa.firstHour || 0;
  } else {
    // Prima ora + ore successive
    totale = (tariffa.firstHour || 0) + ((ore - 1) * tariffaOraria);
  }
  
  return totale;
};

/* ======================================================
   CALCOLO BASE AMOUNT (VERSIONE CORRETTA)
   ====================================================== */
const calculateBaseAmount = (
  oreSosta: number,
  entryTime: string,
  tariffa: TariffaCompleta
): number => {
  console.log(`🧮 Calcolo base per ${oreSosta} ore`);
  
  // 1. Verifica se applicare pernottamento 24h
  if (tariffa.overnight24h && oreSosta >= 24) {
    const giorniInteri = calculateGiorniInteri(oreSosta);
    const oreResidue = oreSosta % 24;
    
    let totale = giorniInteri * tariffa.overnight24h;
    console.log(`🏨 Pernottamento: ${giorniInteri} × €${tariffa.overnight24h} = €${totale}`);
    
    if (oreResidue > 0) {
      // Calcola ore residue con la logica normale
      const ingressoResiduo = new Date(entryTime);
      ingressoResiduo.setHours(ingressoResiduo.getHours() + (giorniInteri * 24));
      
      // Calcola ore residue
      let oreDiurneResidue = 0;
      let oreNotturneResidue = 0;
      
      for (let ora = 1; ora <= oreResidue; ora++) {
        const oraCorrente = (ingressoResiduo.getHours() + ora) % 24;
        if (isNightHour(oraCorrente)) {
          oreNotturneResidue++;
        } else {
          oreDiurneResidue++;
        }
      }
      
      console.log(`⏱️ Ore residue: ${oreDiurneResidue} diurne, ${oreNotturneResidue} notturne`);
      
      const costoDiurnoResiduo = calculateSegmentoOrario(oreDiurneResidue, false, tariffa);
      const costoNotturnoResiduo = calculateSegmentoOrario(oreNotturneResidue, true, tariffa);
      const totaleResiduo = costoDiurnoResiduo + costoNotturnoResiduo;
      
      console.log(`💰 Ore residue: €${costoDiurnoResiduo} + €${costoNotturnoResiduo} = €${totaleResiduo}`);
      totale += totaleResiduo;
    }
    
    return totale;
  }
  
  // 2. Calcolo normale senza pernottamento
  const ingresso = new Date(entryTime);
  const oreIngresso = ingresso.getHours();
  const minutiIngresso = ingresso.getMinutes();
  
  let oreDiurne = 0;
  let oreNotturne = 0;
  let costoTotaleGiorno = 0;
  let ultimoGiornoCompletato = false;
  
  // Simula ora per ora
  for (let ora = 1; ora <= oreSosta; ora++) {
    const oraCorrente = (oreIngresso + ora + Math.floor((minutiIngresso + (ora-1)*60)/60)) % 24;
    
    if (isNightHour(oraCorrente)) {
      oreNotturne++;
    } else {
      oreDiurne++;
    }
    
    // Ogni 24 ore, calcola il massimo diurno
    if (ora % 24 === 0 || ora === oreSosta) {
      if (oreDiurne > 0) {
        const costoDiurno = calculateSegmentoOrario(oreDiurne, false, tariffa);
        costoTotaleGiorno += Math.min(costoDiurno, tariffa.dayMax || Infinity);
        console.log(`📅 Giorno ${Math.ceil(ora/24)}: ${oreDiurne}h diurne = €${Math.min(costoDiurno, tariffa.dayMax || Infinity)}`);
      }
      
      if (oreNotturne > 0) {
        const costoNotturno = calculateSegmentoOrario(oreNotturne, true, tariffa);
        costoTotaleGiorno += costoNotturno;
        console.log(`🌙 Giorno ${Math.ceil(ora/24)}: ${oreNotturne}h notturne = €${costoNotturno}`);
      }
      
      // Reset per il prossimo giorno
      oreDiurne = 0;
      oreNotturne = 0;
      ultimoGiornoCompletato = ora === oreSosta;
    }
  }
  
  console.log(`💰 Totale calcolato: €${costoTotaleGiorno}`);
  return costoTotaleGiorno;
};

/* ======================================================
   CALCOLO IMPORTO PULSANTE
   ====================================================== */
const calculateButtonAmount = (button: ExitButton, giorni: number, ore: number): number => {
  console.log("🔘 calculateButtonAmount INPUT:", { 
    label: button.label, 
    tipo: button.button_type, 
    amount: button.amount,
    giorni,
    ore
  });
  
  // Se button_type è undefined, usa 'fixed' come default
  const tipo = button.button_type || 'fixed';
  
  let risultato: number;
  
  switch (tipo) {
    case 'overnight':
      risultato = button.amount * giorni;
      console.log(`🏨 Overnight: ${button.amount} × ${giorni} = ${risultato}`);
      break;
    
    case 'hourly':
      risultato = button.amount * ore;
      console.log(`⏱️ Hourly: ${button.amount} × ${ore} = ${risultato}`);
      break;
    
    case 'discount':
      risultato = -button.amount;
      console.log(`🏷️ Discount: -${button.amount}%`);
      break;
    
    case 'fixed':
    default:
      risultato = button.amount;
      console.log(`💰 Fixed: ${risultato}`);
      break;
  }
  
  return risultato;
};

/* ======================================================
   ORCHESTRATORE PRINCIPALE DEI PREZZI
   ====================================================== */
export async function calculatePrice({
  tenantId,
  session,
  overrideId = null,
  additionalButtonIds = [],
  lookupResult = null
}: CalculateParams): Promise<PriceResult> {
  console.log("🎯 pricingEngine.calculatePrice", { 
    sessionId: session.id, 
    overrideId, 
    additionalButtons: additionalButtonIds.length,
    hasLookupResult: !!lookupResult,
    hasSubscription: !!lookupResult?.subscription,
    subscriptionType: lookupResult?.subscription?.type,
    isActive: lookupResult?.subscription?.is_active
  });
  
  // ⭐⭐⭐ BLOCCO ABBONAMENTO — VERSIONE DEFINITIVA ⭐⭐⭐
const freeParkingSubscriptions = ["monthly", "annual"];

if (
  lookupResult?.subscription?.subscription_type &&
  freeParkingSubscriptions.includes(lookupResult.subscription.subscription_type) &&
  lookupResult.subscription.is_active === true
) {
  console.log("🟦 CLIENTE ABBONATO (mensile/annuale) → SOSTA GRATUITA (€0)");

  return {
    amount: 0,
    type: "subscription",
    breakdown: {
      baseAmount: 0,
      isSubscription: true,
      subscriptionType: lookupResult.subscription.subscription_type
    }
  };
}


// Se il cliente ha un abbonamento ma non è incluso nei tipi gratuiti
if (lookupResult?.subscription) {
  console.log(
    `📋 Cliente ha abbonamento di tipo: ${lookupResult.subscription.subscription_type}, ` +
    `ma non è incluso in freeParkingSubscriptions → calcolo normale`
  );
}

  
  // 1. Carica tariffe base
  const tariffa = await getTariffaCompleta(tenantId, session.category_id);
  if (!tariffa) {
    throw new Error("Tariffa non trovata per la categoria");
  }
  
  // 2. Calcola ore sosta
  const oreSosta = calculateOreSosta(session.entry_time);
  const giorniInteri = calculateGiorniInteri(oreSosta);
  const oreResidue = oreSosta % 24;
  
  console.log(`⏱️ Ore sosta: ${oreSosta}, Giorni interi: ${giorniInteri}, Ore residue: ${oreResidue}`);
  
  // 3. Carica tutti i pulsanti disponibili
  const allButtons = await getExitButtons(tenantId);
  console.log("📋 Pulsanti caricati:", allButtons.map(b => ({ 
    id: b.id, 
    label: b.label, 
    tipo: b.button_type,
    amount: b.amount 
  })));
  
  const buttonsMap = new Map(allButtons.map(b => [b.id, b]));
  
  // 4. CASO 1: Override
  if (overrideId) {
    const override = buttonsMap.get(overrideId);
    if (override) {
      console.log("🔍 DEBUG OVERRIDE:", {
        id: override.id,
        label: override.label,
        button_type: override.button_type,
        amount: override.amount,
        giorniInteri,
        oreSosta
      });
      
      const importoCalcolato = calculateButtonAmount(override, giorniInteri, oreSosta);
      
      // Se è un pernottamento, aggiungi le ore residue
      let importoTotale = importoCalcolato;
      if (override.button_type === 'overnight' && oreResidue > 0) {
        const importoOreResidue = calculateBaseAmount(oreResidue, session.entry_time, tariffa);
        importoTotale += importoOreResidue;
        console.log(`➕ Aggiunte ore residue: €${importoOreResidue}`);
      }
      
      console.log(`🏷️ Override applicato: ${override.label} = €${importoTotale} (tipo: ${override.button_type})`);
      
      return {
        amount: Number(importoTotale.toFixed(2)),
        type: 'override',
        breakdown: {
          overrides: [{ 
            label: override.button_type === 'overnight' 
              ? `${override.label} (${giorniInteri} giorni)` 
              : override.label, 
            amount: importoTotale 
          }]
        }
      };
    }
  }
  
  // 5. Calcolo base automatico
  const baseAmount = calculateBaseAmount(oreSosta, session.entry_time, tariffa);
  
  // 6. CASO 2: Extra cumulabili
  if (additionalButtonIds.length > 0) {
    const overrides = additionalButtonIds
      .map(id => buttonsMap.get(id))
      .filter(b => b !== undefined) as ExitButton[];
    
    let extraTotal = 0;
    let scontoTotale = 0;
    const processedOverrides = [];
    
    for (const btn of overrides) {
      const importoCalcolato = calculateButtonAmount(btn, giorniInteri, oreSosta);
      
      if (btn.button_type === 'discount') {
        scontoTotale += Math.abs(importoCalcolato);
        processedOverrides.push({ 
          label: `${btn.label} (${Math.abs(importoCalcolato)}%)`, 
          amount: 0
        });
      } else {
        extraTotal += importoCalcolato;
        processedOverrides.push({ 
          label: btn.button_type === 'overnight' 
            ? `${btn.label} (${giorniInteri} giorni)` 
            : btn.label, 
          amount: importoCalcolato 
        });
      }
    }
    
    let total = baseAmount + extraTotal;
    if (scontoTotale > 0) {
      const scontoApplicato = (total * scontoTotale) / 100;
      total -= scontoApplicato;
      processedOverrides.push({ 
        label: `Sconto totale ${scontoTotale}%`, 
        amount: -scontoApplicato 
      });
    }
    
    return {
      amount: Number(total.toFixed(2)),
      type: 'mixed',
      breakdown: {
        baseAmount,
        overrides: processedOverrides
      }
    };
  }
  
  // 7. CASO 3: Solo calcolo automatico
  return {
    amount: baseAmount,
    type: 'automatic',
    breakdown: { baseAmount }
  };
}