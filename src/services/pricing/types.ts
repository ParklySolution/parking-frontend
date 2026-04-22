// src/services/pricing/types.ts

export interface TariffaCompleta {
  // Tariffe base
  firstHour?: number;
  nextHours?: number;
  hourly?: number;
  
  // Fasce orarie
  nightStartHour: number;    // default: 20
  nightEndHour: number;      // default: 8
  nightHourly?: number;
  
  // Massimali
  dayMax?: number;
  nightMax?: number;
  dailyCap?: number;         // per retrocompatibilità
  
  // Pernottamenti
  overnight14_12?: number;
  overnight24h?: number;
  
  // Metadati
  priceListId: string;
  tolleranze?: ParkingTolerance;
}

export interface ParkingTolerance {
  initial_free_minutes: number;
  post_hour_tolerance_minutes: number;
}

export interface CalculationSegment {
  startTime: Date;
  endTime: Date;
  hours: number;
  type: 'day' | 'night' | 'overnight';
  rate: number;
  amount: number;
}

export interface DailyCapApplied {
  day: string;           // YYYY-MM-DD
  cap: number;
  original: number;
}

export interface CalculationResult {
  totalAmount: number;
  segments: CalculationSegment[];
  freeMinutesApplied: number;
  dailyCapsApplied: DailyCapApplied[];
  rules: TariffaCompleta;
}

// Tipo per la sessione (minimo necessario)
export interface ParkingSession {
  id: string;
  entry_time: string;
  category_id: string;
  customer_id?: string;
  ticket_number?: number;
}

// Parametri per il calcolo
export interface CalculateParams {
  tenantId: string;
  session: ParkingSession;
  exitTime: Date;
}