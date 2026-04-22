import { supabase } from "@/services/supabase";

export interface ParkingTolerance {
  initial_free_minutes: number;
  post_hour_tolerance_minutes: number;
  first_hour_tolerance_minutes: number;
  first_hour_tolerance_price: number;
}

export async function fetchParkingTolerance(
  tenantId: string
): Promise<ParkingTolerance | null> {
  const { data, error } = await supabase
    .from("parking_tolerances")
    .select(`
      initial_free_minutes,
      post_hour_tolerance_minutes,
      first_hour_tolerance_minutes,
      first_hour_tolerance_price
    `)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    console.error("Errore tolleranze", error);
    return null;
  }

  return data;
}

export async function upsertParkingTolerance(
  tenantId: string,
  initialFree: number,
  postHour: number,
  firstHourToleranceMinutes: number,
  firstHourTolerancePrice: number
) {
  const { error } = await supabase
    .from("parking_tolerances")
    .upsert(
      {
        tenant_id: tenantId,
        initial_free_minutes: initialFree,
        post_hour_tolerance_minutes: postHour,
        first_hour_tolerance_minutes: firstHourToleranceMinutes,
        first_hour_tolerance_price: firstHourTolerancePrice,
      },
      { onConflict: "tenant_id" }
    );

  if (error) throw error;
}
