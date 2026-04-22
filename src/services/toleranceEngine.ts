export function calculateBillableMinutes(
  realMinutes: number,
  tolerance: {
    initial_free_minutes: number;
    post_hour_tolerance_minutes: number;
    first_hour_tolerance_minutes: number;
    first_hour_tolerance_price: number;
  }
) {
  const {
    initial_free_minutes,
    post_hour_tolerance_minutes,
    first_hour_tolerance_minutes,
    first_hour_tolerance_price,
  } = tolerance;

  // 1. Tolleranza iniziale gratuita
  if (realMinutes <= initial_free_minutes) {
    return { billableMinutes: 0, tolerancePrice: 0 };
  }

  const minutesAfterInitial = realMinutes - initial_free_minutes;

  // 2. Tolleranza prima ora (gratis o a pagamento)
  if (minutesAfterInitial <= first_hour_tolerance_minutes) {
    return {
      billableMinutes: 0,
      tolerancePrice: first_hour_tolerance_price || 0,
    };
  }

  // 3. Logica post-ora
  const fullHours = Math.floor(minutesAfterInitial / 60);
  const remaining = minutesAfterInitial % 60;

  let billableHours = fullHours;

  if (remaining > post_hour_tolerance_minutes) {
    billableHours += 1;
  }

  return {
    billableMinutes: billableHours * 60,
    tolerancePrice: 0,
  };
}
