// src/services/pricing/rules/dayRules.ts

import type { TariffaCompleta, CalculationSegment } from "../types";

/**
 * Calcola l'importo per un segmento diurno
 */
export function calculateDaySegment(
  segment: CalculationSegment,
  tariffa: TariffaCompleta,
  isFirstSegmentOfDay: boolean
): number {
  if (segment.type !== 'day') return 0;
  
  // Tariffa differenziata (prima ora + ore successive)
  if (tariffa.firstHour !== undefined && tariffa.nextHours !== undefined) {
    if (isFirstSegmentOfDay) {
      // Primo segmento del giorno: applica prima ora
      const oreRestanti = Math.max(0, segment.hours - 1);
      return tariffa.firstHour + (oreRestanti * tariffa.nextHours);
    } else {
      // Segmenti successivi: solo ore successive
      return segment.hours * tariffa.nextHours;
    }
  }
  
  // Tariffa oraria unica
  if (tariffa.hourly !== undefined) {
    return segment.hours * tariffa.hourly;
  }
  
  // Nessuna tariffa valida
  console.warn("⚠️ Nessuna tariffa diurna valida");
  return 0;
}

/**
 * Calcola l'importo per un segmento notturno
 */
export function calculateNightSegment(
  segment: CalculationSegment,
  tariffa: TariffaCompleta
): number {
  if (segment.type !== 'night') return 0;
  
  if (tariffa.nightHourly === undefined) {
    console.warn("⚠️ Tariffa notturna non definita, uso tariffa diurna");
    // Fallback: usa tariffa diurna
    return calculateDaySegment(segment, tariffa, true);
  }
  
  return segment.hours * tariffa.nightHourly;
}

/**
 * Calcola gli importi per tutti i segmenti
 */
export function calculateSegments(
  segments: CalculationSegment[],
  tariffa: TariffaCompleta
): CalculationSegment[] {
  let lastDayKey = '';
  
  return segments.map(segment => {
    const dayKey = segment.startTime.toISOString().split('T')[0];
    const isFirstOfDay = dayKey !== lastDayKey;
    lastDayKey = dayKey;
    
    if (segment.type === 'night') {
      segment.rate = tariffa.nightHourly || 0;
      segment.amount = calculateNightSegment(segment, tariffa);
    } else {
      segment.rate = tariffa.firstHour || tariffa.hourly || 0;
      segment.amount = calculateDaySegment(segment, tariffa, isFirstOfDay);
    }
    
    // Arrotonda a 2 decimali
    segment.amount = Math.round(segment.amount * 100) / 100;
    
    return segment;
  });
}