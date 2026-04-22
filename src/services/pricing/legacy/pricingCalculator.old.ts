// src/services/pricingCalculator.ts

// Costanti FISSE per le fasce orarie (STANDARD PROFESSIONALE)
const NIGHT_START_HOUR = 20; // 20:00
const NIGHT_END_HOUR = 8;    // 08:00

export interface TariffaCompleta {
  // Tariffe base (accettiamo sia camelCase che snake_case per sicurezza)
  firstHour?: number;
  first_hour?: number;
  
  nextHours?: number;
  next_hours?: number;
  
  hourly?: number;
  
  // Tariffa notturna
  nightHourly?: number;
  night_hourly?: number;
  
  // Massimali
  dayMax?: number;
  daily_cap?: number;
  
  nightMax?: number;
  
  // Pernottamento
  overnight24h?: number;
  overnight_fixed?: number;
}

/**
 * Determina se un'ora è in fascia notturna (20:00 - 08:00)
 */
const isNightHour = (hour: number): boolean => {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
};

/**
 * Calcola il costo per un numero di ore in una fascia specifica
 */
const calculateFascia = (
  ore: number,
  isNotturna: boolean,
  tariffa: TariffaCompleta
): number => {
  if (ore === 0) return 0;
  
  let totale = 0;

  // Estrazione sicura dei valori (fallback tra camelCase e snake_case)
  const t_nightHourly = tariffa.nightHourly ?? tariffa.night_hourly ?? 0;
  const t_dayMax = tariffa.dayMax ?? tariffa.daily_cap;
  const t_firstHour = tariffa.firstHour ?? tariffa.first_hour;
  const t_nextHours = tariffa.nextHours ?? tariffa.next_hours;
  const t_hourly = tariffa.hourly;
  
  if (isNotturna) {
    // Fascia notturna (20-8)
    console.log(`🌙 Tariffa notturna applicata: €${t_nightHourly}/h per ${ore} ore`);
    totale = ore * t_nightHourly;
    
    // Applica massimale notturno (se esiste)
    if (tariffa.nightMax && totale > tariffa.nightMax) {
      console.log(`🌙 Massimale notturno applicato: €${tariffa.nightMax} (era €${totale})`);
      totale = tariffa.nightMax;
    }
  } else {
    // Fascia diurna (8-20)
    if (t_firstHour !== undefined && t_nextHours !== undefined) {
      totale += t_firstHour;
      totale += Math.max(0, ore - 1) * t_nextHours;
      console.log(`☀️ Tariffa diurna differenziata: prima ora €${t_firstHour}, successive €${t_nextHours}/h per ${ore} ore = €${totale}`);
    } else if (t_hourly !== undefined) {
      totale = ore * t_hourly;
      console.log(`☀️ Tariffa diurna unica: €${t_hourly}/h per ${ore} ore = €${totale}`);
    }
    
    // Applica massimale diurno
    if (t_dayMax && totale > t_dayMax) {
      console.log(`☀️ Massimale diurno applicato: €${t_dayMax} (era €${totale})`);
      totale = t_dayMax;
    }
  }
  
  return totale;
};

/**
 * Calcola le ore per fascia oraria
 */
const calculateOrePerFascia = (
  oreSosta: number,
  orarioIngresso: string
): { oreDiurne: number; oreNotturne: number } => {
  const ingresso = new Date(orarioIngresso);
  const oreIngresso = ingresso.getHours();
  const minutiIngresso = ingresso.getMinutes();
  
  console.log(`🕐 Ingresso: ${oreIngresso}:${minutiIngresso.toString().padStart(2,'0')}`);
  
  let oreDiurne = 0;
  let oreNotturne = 0;
  let dettaglio: string[] = [];
  
  for (let ora = 1; ora <= oreSosta; ora++) {
    const oraCorrente = (oreIngresso + ora + Math.floor((minutiIngresso + (ora-1)*60)/60)) % 24;
    
    if (isNightHour(oraCorrente)) {
      oreNotturne++;
      if (ora <= 10) dettaglio.push(`Ora ${ora}: ${oraCorrente}:00 → 🌙 NOTTE`);
    } else {
      oreDiurne++;
      if (ora <= 10) dettaglio.push(`Ora ${ora}: ${oraCorrente}:00 → ☀️ GIORNO`);
    }
  }
  
  return { oreDiurne, oreNotturne };
};

/**
 * Calcola l'importo totale per una sosta con PRIORITÀ AI PERNOTTAMENTI
 */
export function calculateParkingAmount(
  oreSosta: number,
  orarioIngresso: string,
  tariffa: TariffaCompleta
): number {
  // Estrazione sicura della tariffa pernottamento
  const t_overnight24h = tariffa.overnight24h ?? tariffa.overnight_fixed;

  console.log("🧮 CALCOLO INIZIATO", { 
    oreSosta, 
    orarioIngresso, 
    nightHourlyPresente: (tariffa.nightHourly ?? tariffa.night_hourly) !== undefined,
    overnight24hPresente: t_overnight24h !== undefined
  });
  
  if (oreSosta === 0) return 0;
  
  // 🔴 PRIORITÀ 1: Pernottamento 24h
  if (t_overnight24h && oreSosta >= 24) {
    const giorniInteri = Math.floor(oreSosta / 24);
    const oreResidue = oreSosta % 24;
    
    console.log(`🏨 Pernottamento 24h attivo: ${giorniInteri} giorni completi a €${t_overnight24h}`);
    
    let totale = giorniInteri * t_overnight24h;
    
    // Calcola le ore residue con tariffe normali e massimali
    if (oreResidue > 0) {
      console.log(`⏱️ Ore residue da calcolare: ${oreResidue}`);
      const { oreDiurne, oreNotturne } = calculateOrePerFascia(oreResidue, orarioIngresso);
      
      const costoTotaleGiorno = calculateFascia(oreDiurne, false, tariffa);
      const costoTotaleNotte = calculateFascia(oreNotturne, true, tariffa);
      
      totale += costoTotaleGiorno + costoTotaleNotte;
    }
    
    console.log(`💰 TOTALE CON PERNOTTAMENTI: €${totale}`);
    return totale;
  }
  
  // 🔴 PRIORITÀ 2: Calcolo normale < 24h
  console.log("📊 Calcolo standard con fasce orarie fisse (20-8)");
  const { oreDiurne, oreNotturne } = calculateOrePerFascia(oreSosta, orarioIngresso);
  
  const costoTotaleGiorno = calculateFascia(oreDiurne, false, tariffa);
  const costoTotaleNotte = calculateFascia(oreNotturne, true, tariffa);
  
  const totale = costoTotaleGiorno + costoTotaleNotte;
  console.log(`💰 TOTALE FINALE: €${totale} (giorno: €${costoTotaleGiorno}, notte: €${costoTotaleNotte})`);
  
  return totale;
}

export const calculateDynamicParkingAmount = calculateParkingAmount;