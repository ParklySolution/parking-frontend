import { calculateBillableMinutes } from "./ToleranceEngine";

export interface PriceRules {
  first_hour?: number;
  next_hours?: number;
  hourly?: number;
  daily_cap?: number;
}

export interface ParkingPriceResult {
  totalPrice: number;
  billableMinutes: number;
  tolerancePrice: number;
  breakdown: {
    firstHour?: number;
    nextHours?: number;
    hourly?: number;
    dailyCapApplied?: boolean;
  };
}

export function calculateParkingPriceV2(
  realMinutes: number,
  tolerance: {
    initial_free_minutes: number;
    post_hour_tolerance_minutes: number;
    first_hour_tolerance_minutes: number;
    first_hour_tolerance_price: number;
  },
  rules: PriceRules
): ParkingPriceResult {
  // 1. Calcolo tolleranze
  const { billableMinutes, tolerancePrice } = calculateBillableMinutes(
    realMinutes,
    tolerance
  );

  // Se la tolleranza copre tutto
  if (billableMinutes === 0) {
    return {
      totalPrice: tolerancePrice,
      billableMinutes: 0,
      tolerancePrice,
      breakdown: { tolerance: tolerancePrice },
    };
  }

  let remaining = billableMinutes;
  let total = 0;
  const breakdown: any = {};

  // 2. Daily cap per giorni interi
  if (rules.daily_cap) {
    const fullDays = Math.floor(remaining / (60 * 24));
    if (fullDays > 0) {
      total += fullDays * rules.daily_cap;
      breakdown.dailyCapApplied = true;
      remaining -= fullDays * 24 * 60;
    }
  }

  // 3. Prima ora
  if (rules.first_hour && remaining > 0) {
    total += rules.first_hour;
    breakdown.firstHour = rules.first_hour;

    remaining -= 60;
    if (remaining < 0) remaining = 0;
  }

  // 4. Ore successive
  if (rules.next_hours && remaining > 0) {
    const hours = Math.ceil(remaining / 60);
    const price = hours * rules.next_hours;

    total += price;
    breakdown.nextHours = price;

    remaining = 0;
  }

  // 5. Tariffa oraria unica (fallback)
  if (rules.hourly && remaining > 0) {
    const hours = Math.ceil(remaining / 60);
    const price = hours * rules.hourly;

    total += price;
    breakdown.hourly = price;

    remaining = 0;
  }

  // 6. Daily cap finale
  if (rules.daily_cap && total > rules.daily_cap) {
    total = rules.daily_cap;
    breakdown.dailyCapApplied = true;
  }

  return {
    totalPrice: total + tolerancePrice,
    billableMinutes,
    tolerancePrice,
    breakdown,
  };
}
