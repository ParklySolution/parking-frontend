// src/services/pricing/rules/segmenter.ts

import type { TariffaCompleta, CalculationSegment } from "../types";

/**
 * Determina se un'ora è in fascia notturna
 */
export function isNightHour(
  hour: number,
  nightStart: number,
  nightEnd: number
): boolean {
  if (nightStart > nightEnd) {
    // Caso standard: notte che attraversa la mezzanotte (es: 20-8)
    return hour >= nightStart || hour < nightEnd;
  } else {
    // Caso raro: notte che non attraversa mezzanotte (es: 22-6)
    return hour >= nightStart && hour < nightEnd;
  }
}

/**
 * Trova il prossimo cambio di fascia oraria
 */
export function findNextBoundary(
  currentTime: Date,
  nightStart: number,
  nightEnd: number
): Date {
  const currentHour = currentTime.getHours();
  const isNight = isNightHour(currentHour, nightStart, nightEnd);
  
  const nextBoundary = new Date(currentTime);
  
  if (isNight) {
    // Siamo in notte, prossimo cambio = fine notte
    nextBoundary.setHours(nightEnd, 0, 0, 0);
    if (nextBoundary <= currentTime) {
      nextBoundary.setDate(nextBoundary.getDate() + 1);
    }
  } else {
    // Siamo in giorno, prossimo cambio = inizio notte
    nextBoundary.setHours(nightStart, 0, 0, 0);
    if (nextBoundary <= currentTime) {
      nextBoundary.setDate(nextBoundary.getDate() + 1);
    }
  }
  
  return nextBoundary;
}

/**
 * Divide la sosta in segmenti in base alle fasce orarie
 */
export function segmentParking(
  entryTime: Date,
  exitTime: Date,
  tariffa: TariffaCompleta
): CalculationSegment[] {
  const segments: CalculationSegment[] = [];
  let currentTime = new Date(entryTime);
  
  console.log(`🔪 Segmentazione: ${entryTime.toISOString()} -> ${exitTime.toISOString()}`);
  
  while (currentTime < exitTime) {
    const currentHour = currentTime.getHours();
    const isNight = isNightHour(
      currentHour,
      tariffa.nightStartHour,
      tariffa.nightEndHour
    );
    
    // Trova prossimo cambio fascia
    const nextBoundary = findNextBoundary(
      currentTime,
      tariffa.nightStartHour,
      tariffa.nightEndHour
    );
    
    const segmentEnd = nextBoundary < exitTime ? nextBoundary : exitTime;
    const hours = (segmentEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    
    // Arrotonda a 2 decimali per evitare problemi con floating point
    const roundedHours = Math.round(hours * 100) / 100;
    
    segments.push({
      startTime: new Date(currentTime),
      endTime: new Date(segmentEnd),
      hours: roundedHours,
      type: isNight ? 'night' : 'day',
      rate: 0, // sarà calcolato dopo
      amount: 0
    });
    
    console.log(`  Segmento: ${currentTime.toLocaleTimeString()}-${segmentEnd.toLocaleTimeString()} = ${roundedHours}h (${isNight ? '🌙' : '☀️'})`);
    
    currentTime = segmentEnd;
  }
  
  console.log(`📊 Totale segmenti: ${segments.length}`);
  return segments;
}

/**
 * Raggruppa i segmenti per giorno
 */
export function groupSegmentsByDay(
  segments: CalculationSegment[]
): Map<string, CalculationSegment[]> {
  const groups = new Map<string, CalculationSegment[]>();
  
  segments.forEach(segment => {
    const dayKey = segment.startTime.toISOString().split('T')[0];
    if (!groups.has(dayKey)) {
      groups.set(dayKey, []);
    }
    groups.get(dayKey)!.push(segment);
  });
  
  return groups;
}