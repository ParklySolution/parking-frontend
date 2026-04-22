import { supabase } from "./supabase";

export async function checkActiveSubscription(plate: string) {
  const { data, error } = await supabase.rpc(
    "get_active_subscription_by_plate",
    { p_plate: plate }
  );

  if (error) {
    console.error("Errore verifica abbonamento:", error);
    return null;
  }

  return data?.[0] ?? null;
}
