// src/services/pricing/engine.ts

import { loadPriceRules } from "./loader";
import { segmentParking } from "./rules/segmenter";
import { calculateSegments } from "./rules/dayRules";
import { applyDailyCaps, applyGlobalCap } from "./rules/caps";
import type { CalculateParams, CalculationResult } from "./types";

/**
 * Verifica e applica i pernottamenti speciali
 */
function checkOvernightSpecial(
  totalHours: number,
  tariffa: any,
  entryTime: Date,
  exitTime: Date
): { applied: boolean; total: number } {
  
  // Pernottamento 24h
  if (tariffa.overnight24h && totalHours >= 24) {
    const giorniInteri = Math.floor(totalHours / 24);
    const oreResidue = totalHours % 24;
    
    console.log(`🏨 Applico ${giorniInteri}x overnight24h (€${tariffa.overnight24h}) + ${oreResidue}h residue`);
    
    let totale = giorniInteri * tariffa.overnight24h;
    
    if (oreResidue > 0) {
      // Se le ore residue sono >= 22, applica un altro overnight24h
      if (tariffa.overnight14_12 && oreResidue >= 22) {
        console.log(`🏨 Ore residue ${oreResidue} >= 22 → altro overnight24h`);
        totale += tariffa.overnight24h;
      }
      // Altrimenti le ore residue verranno calcolate separatamente
    }
    
    return { applied: true, total: totale };
  }
  
  // Pernottamento 14-12
  if (tariffa.overnight14_12 && totalHours >= 22 && totalHours < 24) {
    console.log(`🏨 Applico overnight14_12: €${tariffa.overnight14_12}`);
    return { applied: true, total: tariffa.overnight14_12 };
  }
  
  return { applied: false, total: 0 };
}

/**
 * Motore principale di calcolo (VERSIONE 2.0)
 */
export async function calculateParkingAmountV2({
  tenantId,
  session,
  exitTime,
}: CalculateParams): Promise<CalculationResult> {
  console.log("🧮 [pricing/engine] Inizio calcolo V2");
  
  const entryTime = new Date(session.entry_time);
  
  // 1. Carica regole
  const tariffa = await loadPriceRules(tenantId, session.category_id);
  if (!tariffa) {
    throw new Error(`Tariffa non trovata per categoria ${session.category_id}`);
  }
  
  // 2. Applica minuti gratuiti
  let freeMinutesApplied = 0;
  let adjustedEntry = entryTime;
  
  if (tariffa.tolleranze?.initial_free_minutes) {
    const freeMs = tariffa.tolleranze.initial_free_minutes * 60 * 1000;
    const freeExit = new Date(entryTime.getTime() + freeMs);
    
    if (freeExit >= exitTime) {
      console.log("⏱️ Sosta interamente coperta da minuti gratuiti");
      return {
        totalAmount: 0,
        segments: [],
        freeMinutesApplied: tariffa.tolleranze.initial_free_minutes,
        dailyCapsApplied: [],
        rules: tariffa
      };
    }
    
    adjustedEntry = freeExit;
    freeMinutesApplied = tariffa.tolleranze.initial_free_minutes;
    console.log(`⏱️ Applicati ${freeMinutesApplied} minuti gratuiti`);
  }
  
  // 3. Calcola ore totali (dopo minuti gratuiti)
  const totalHours = (exitTime.getTime() - adjustedEntry.getTime()) / (1000 * 60 * 60);
  console.log(`⏱️ Ore totali da calcolare: ${totalHours.toFixed(2)}h`);
  
  // 4. Verifica pernottamenti speciali
  const overnight = checkOvernightSpecial(totalHours, tariffa, adjustedEntry, exitTime);
  
  if (overnight.applied) {
    // Se ci sono ore residue dopo l'overnight, calcolale separatamente
    if (tariffa.overnight24h && totalHours >= 24) {
      const giorniInteri = Math.floor(totalHours / 24);
      const oreResidue = totalHours % 24;
      
      let totale = giorniInteri * tariffa.overnight24h;
      let segments: any[] = [];
      let dailyCapsApplied: any[] = [];
      
      if (oreResidue > 0 && !(tariffa.overnight14_12 && oreResidue >= 22)) {
        // Calcola ore residue con segmentazione
        const residueEnd = new Date(adjustedEntry.getTime() + oreResidue * 60 * 60 * 1000);
        segments = segmentParking(adjustedEntry, residueEnd, tariffa);
        segments = calculateSegments(segments, tariffa);
        const { segments: cappedSegments, caps } = applyDailyCaps(segments, tariffa);
        segments = cappedSegments;
        dailyCapsApplied = caps;
        totale += segments.reduce((sum, s) => sum + s.amount, 0);
      }
      
      return {
        totalAmount: Math.round(totale * 100) / 100,
        segments,
        freeMinutesApplied,
        dailyCapsApplied,
        rules: tariffa
      };
    }
    
    // Pernottamento semplice (senza ore residue)
    return {
      totalAmount: overnight.total,
      segments: [],
      freeMinutesApplied,
      dailyCapsApplied: [],
      rules: tariffa
    };
  }
  
  // 5. Calcolo standard con segmentazione
  console.log("📊 Calcolo standard con segmentazione");
  let segments = segmentParking(adjustedEntry, exitTime, tariffa);
  segments = calculateSegments(segments, tariffa);
  
  // 6. Applica massimali giornalieri
  const { segments: cappedSegments, caps: dailyCapsApplied } = applyDailyCaps(segments, tariffa);
  
  // 7. Calcola totale
  const total = cappedSegments.reduce((sum, s) => sum + s.amount, 0);
  
  // 8. Applica massimale globale (per retrocompatibilità)
  const finalTotal = applyGlobalCap(total, tariffa);
  
  console.log(`💰 TOTALE FINALE: €${finalTotal.toFixed(2)}`);
  
  return {
    totalAmount: finalTotal,
    segments: cappedSegments,
    freeMinutesApplied,
    dailyCapsApplied,
    rules: tariffa
  };
}

// Alias per compatibilità con il vecchio nome
export const calculateParkingAmount = calculateParkingAmountV2;