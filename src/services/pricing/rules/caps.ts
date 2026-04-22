// src/services/pricing/rules/caps.ts

import type { TariffaCompleta, CalculationSegment, DailyCapApplied } from "../types";
import { groupSegmentsByDay } from "./segmenter";

/**
 * Applica i massimali giornalieri ai segmenti
 */
export function applyDailyCaps(
  segments: CalculationSegment[],
  tariffa: TariffaCompleta
): { segments: CalculationSegment[]; caps: DailyCapApplied[] } {
  const capsApplied: DailyCapApplied[] = [];
  const segmentsByDay = groupSegmentsByDay(segments);
  
  // Crea una copia profonda dei segmenti per non modificare l'originale
  const updatedSegments = segments.map(s => ({ ...s }));
  
  for (const [day, daySegments] of segmentsByDay.entries()) {
    // Calcola totale del giorno
    const dayTotal = daySegments.reduce((sum, s) => sum + s.amount, 0);
    
    // Determina se il giorno ha ore notturne
    const hasNight = daySegments.some(s => s.type === 'night');
    
    // Scegli il massimale appropriato
    const cap = hasNight ? tariffa.nightMax : tariffa.dayMax;
    
    // Se non c'è massimale o il totale è sotto, salta
    if (!cap || dayTotal <= cap) continue;
    
    console.log(`📅 Giorno ${day}: applico massimale €${cap} (era €${dayTotal})`);
    
    // Calcola il fattore di riduzione
    const ratio = cap / dayTotal;
    
    // Applica il massimale proporzionalmente a tutti i segmenti del giorno
    for (const segment of daySegments) {
      const originalAmount = segment.amount;
      const newAmount = originalAmount * ratio;
      
      // Trova e aggiorna il segmento nella lista principale
      const targetSegment = updatedSegments.find(s => 
        s.startTime.getTime() === segment.startTime.getTime() &&
        s.endTime.getTime() === segment.endTime.getTime()
      );
      
      if (targetSegment) {
        targetSegment.amount = Math.round(newAmount * 100) / 100;
      }
    }
    
    capsApplied.push({
      day,
      cap,
      original: dayTotal
    });
  }
  
  return { segments: updatedSegments, caps: capsApplied };
}

/**
 * Applica il massimale complessivo (dailyCap) - per retrocompatibilità
 */
export function applyGlobalCap(
  total: number,
  tariffa: TariffaCompleta
): number {
  if (tariffa.dailyCap && total > tariffa.dailyCap) {
    console.log(`📊 Massimale globale applicato: €${tariffa.dailyCap} (era €${total})`);
    return tariffa.dailyCap;
  }
  return total;
}