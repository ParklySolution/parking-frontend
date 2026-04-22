// src/services/pricing/legacy/compat.ts

import { calculateParkingAmountV2 } from '../engine';
import type { CalculateParams } from '../types';

/**
 * Wrapper per mantenere la stessa firma della funzione originale
 */
export async function calculateParkingAmountLegacy(
  params: any
): Promise<{ finalAmount: number; breakdown: string[] }> {
  try {
    const result = await calculateParkingAmountV2(params as CalculateParams);
    
    // Genera breakdown leggibile
    const breakdown = result.segments.map(s => 
      `${s.startTime.toLocaleTimeString()}-${s.endTime.toLocaleTimeString()}: ` +
      `${s.hours.toFixed(2)}h × €${s.rate.toFixed(2)} = €${s.amount.toFixed(2)}`
    );
    
    if (result.freeMinutesApplied > 0) {
      breakdown.unshift(`🎁 Minuti gratuiti applicati: ${result.freeMinutesApplied}`);
    }
    
    result.dailyCapsApplied.forEach(cap => {
      breakdown.push(`📅 Cap giornaliero ${cap.day}: €${cap.cap.toFixed(2)} (era €${cap.original.toFixed(2)})`);
    });
    
    return {
      finalAmount: result.totalAmount,
      breakdown
    };
  } catch (error) {
    console.error("❌ Errore in calculateParkingAmountLegacy:", error);
    return {
      finalAmount: 0,
      breakdown: [`Errore: ${error}`]
    };
  }
}

// Mantieni anche le altre funzioni legacy se necessario
export * from './pricingEngine';
export * from './pricingCalculator';