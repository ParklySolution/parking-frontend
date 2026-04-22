// src/services/pricing/pricingCalculator.ts

// Costanti FISSE (non cambiano mai)
export const NIGHT_START = 20; // 20:00
export const NIGHT_END = 8;    // 08:00

export interface TariffaBase {
  first_hour?: number;
  next_hours?: number;
  hourly?: number;
  night_hourly?: number;
}

/**
 * Determina se un'ora è in fascia notturna (20-8)
 */
export const isNightHour = (hour: number): boolean => {
  return hour >= NIGHT_START || hour < NIGHT_END;
};

/**
 * Calcola le ore di sosta (arrotondamento professionale)
 */
export function calculateOreSosta(entryTime: string, exitTime: Date = new Date()): number {
  const ingresso = new Date(entryTime);
  const diffMs = exitTime.getTime() - ingresso.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < 10) return 0; // Sosta gratuita < 10 min
  if (diffMinutes <= 60) return 1; // Fino a 60 min = 1 ora
  
  const oreComplete = Math.floor(diffMinutes / 60);
  const minutiResidui = diffMinutes % 60;
  
  return minutiResidui > 10 ? oreComplete + 1 : oreComplete;
}

/**
 * Calcola le ore diurne e notturne
 */
export function calculateOrePerFascia(
  oreSosta: number,
  orarioIngresso: string
): { oreDiurne: number; oreNotturne: number } {
  const ingresso = new Date(orarioIngresso);
  const oreIngresso = ingresso.getHours();
  const minutiIngresso = ingresso.getMinutes();
  
  let oreDiurne = 0;
  let oreNotturne = 0;
  
  for (let ora = 1; ora <= oreSosta; ora++) {
    const oraCorrente = (oreIngresso + ora + Math.floor((minutiIngresso + (ora-1)*60)/60)) % 24;
    
    if (isNightHour(oraCorrente)) {
      oreNotturne++;
    } else {
      oreDiurne++;
    }
  }
  
  return { oreDiurne, oreNotturne };
}

/**
 * CALCOLO BASE: prima ora + ore successive + notturna
 */
export function calculateBaseAmount(
  oreSosta: number,
  orarioIngresso: string,
  tariffa: TariffaBase
): number {
  if (oreSosta === 0) return 0;
  
  const { oreDiurne, oreNotturne } = calculateOrePerFascia(oreSosta, orarioIngresso);
  
  // Calcolo diurno
  let totaleDiurno = 0;
  if (tariffa.first_hour !== undefined && tariffa.next_hours !== undefined) {
    // Tariffa differenziata
    totaleDiurno = tariffa.first_hour + Math.max(0, oreDiurne - 1) * tariffa.next_hours;
  } else if (tariffa.hourly !== undefined) {
    // Tariffa unica
    totaleDiurno = oreDiurne * tariffa.hourly;
  }
  
  // Calcolo notturno
  const totaleNotturno = oreNotturne * (tariffa.night_hourly || 0);
  
  return Number((totaleDiurno + totaleNotturno).toFixed(2));
}