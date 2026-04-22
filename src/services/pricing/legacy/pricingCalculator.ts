// src/services/pricingCalculator.ts

interface TariffaCompleta {
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

/**
 * Determina se un'ora è in fascia notturna
 */
const isNightHour = (hour: number, nightStart: number, nightEnd: number): boolean => {
  if (nightStart > nightEnd) {
    // Caso standard: notte che attraversa la mezzanotte (es: 20-8)
    return hour >= nightStart || hour < nightEnd;
  } else {
    // Caso raro: notte che non attraversa mezzanotte
    return hour >= nightStart && hour < nightEnd;
  }
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
  
  if (isNotturna) {
    // Fascia notturna
    totale = ore * (tariffa.nightHourly || 0);
    
    // Applica massimale notturno
    if (tariffa.nightMax && totale > tariffa.nightMax) {
      console.log(`🌙 Massimale notturno applicato: €${tariffa.nightMax} (era €${totale})`);
      totale = tariffa.nightMax;
    }
  } else {
    // Fascia diurna
    if (tariffa.firstHour !== undefined && tariffa.nextHours !== undefined) {
      // Tariffa differenziata: prima ora + ore successive
      totale += tariffa.firstHour;
      totale += Math.max(0, ore - 1) * tariffa.nextHours;
    } else if (tariffa.hourly !== undefined) {
      // Tariffa unica
      totale = ore * tariffa.hourly;
    }
    
    // Applica massimale diurno
    if (tariffa.dayMax && totale > tariffa.dayMax) {
      console.log(`☀️ Massimale diurno applicato: €${tariffa.dayMax} (era €${totale})`);
      totale = tariffa.dayMax;
    }
  }
  
  return totale;
};

/**
 * Calcola le ore per fascia oraria
 */
const calculateOrePerFascia = (
  oreSosta: number,
  orarioIngresso: string,
  tariffa: TariffaCompleta
): { oreDiurne: number; oreNotturne: number } => {
  const ingresso = new Date(orarioIngresso);
  const oreIngresso = ingresso.getHours();
  const minutiIngresso = ingresso.getMinutes();
  
  let oreDiurne = 0;
  let oreNotturne = 0;
  
  for (let ora = 1; ora <= oreSosta; ora++) {
    // Calcola l'ora del giorno per questa ora di sosta
    const oraCorrente = (oreIngresso + ora + Math.floor((minutiIngresso + (ora-1)*60)/60)) % 24;
    
    if (isNightHour(oraCorrente, tariffa.nightStartHour, tariffa.nightEndHour)) {
      oreNotturne++;
    } else {
      oreDiurne++;
    }
  }
  
  return { oreDiurne, oreNotturne };
};

/**
 * Calcola l'importo totale per una sosta con PRIORITÀ AI PERNOTTAMENTI
 */
export function calculateDynamicParkingAmount(
  oreSosta: number,
  orarioIngresso: string,
  tariffa: TariffaCompleta
): number {
  console.log("🧮 CALCOLO INIZIATO", { oreSosta, orarioIngresso, tariffa });
  
  if (oreSosta === 0) return 0;
  
  // 🔴 PRIORITÀ 1: Pernottamento 24h (per qualsiasi durata che superi le 24 ore)
  if (tariffa.overnight24h && oreSosta >= 24) {
    const giorniInteri = Math.floor(oreSosta / 24);
    const oreResidue = oreSosta % 24;
    
    console.log(`🏨 Pernottamento 24h attivo: ${giorniInteri} giorni completi a €${tariffa.overnight24h}`);
    
    let totale = giorniInteri * tariffa.overnight24h;
    
    // Calcola le ore residue
    if (oreResidue > 0) {
      console.log(`⏱️ Ore residue da calcolare: ${oreResidue}`);
      
      // Se le ore residue sono >= 22, applica un altro pernottamento 24h
      if (tariffa.overnight14_12 && oreResidue >= 22) {
        console.log(`🏨 Ore residue ${oreResidue} >= 22 → applico altro pernottamento 24h`);
        totale += tariffa.overnight24h;
      } else {
        // Altrimenti calcola le ore residue con tariffe normali
        const { oreDiurne, oreNotturne } = calculateOrePerFascia(oreResidue, orarioIngresso, tariffa);
        console.log(`📊 Ore residue: ${oreDiurne} diurne, ${oreNotturne} notturne`);
        
        const costoTotaleGiorno = calculateFascia(oreDiurne, false, tariffa);
        const costoTotaleNotte = calculateFascia(oreNotturne, true, tariffa);
        
        totale += costoTotaleGiorno + costoTotaleNotte;
      }
    }
    
    console.log(`💰 TOTALE CON PERNOTTAMENTI: €${totale}`);
    return totale;
  }
  
  // 🔴 PRIORITÀ 2: Pernottamento 14-12 (22 ore)
  if (tariffa.overnight14_12 && oreSosta >= 22 && oreSosta < 24) {
    console.log(`🏨 Applicato overnight14_12: €${tariffa.overnight14_12}`);
    return tariffa.overnight14_12;
  }
  
  // 🔴 PRIORITÀ 3: Calcolo normale con fasce orarie
  console.log("📊 Calcolo standard con fasce orarie");
  const { oreDiurne, oreNotturne } = calculateOrePerFascia(oreSosta, orarioIngresso, tariffa);
  console.log(`📊 Ore totali: ${oreDiurne} diurne, ${oreNotturne} notturne`);
  
  const costoTotaleGiorno = calculateFascia(oreDiurne, false, tariffa);
  const costoTotaleNotte = calculateFascia(oreNotturne, true, tariffa);
  
  const totale = costoTotaleGiorno + costoTotaleNotte;
  console.log(`💰 TOTALE: €${totale} (giorno: €${costoTotaleGiorno}, notte: €${costoTotaleNotte})`);
  
  return totale;
}