import { supabase } from "@/services/supabase";
import type { PlateLog } from "@/types/plateLog";

export async function fetchPlateLogs(): Promise<PlateLog[]> {
  const { data, error } = await supabase
    .from("subscription_transits")
    .select("*")
    .order("entry_time", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Errore fetchPlateLogs", error);
    throw error;
  }

  return (
    data?.map((row) => ({
      plate: row.vehicle_plate,
      status: row.exit_time ? "EXIT" : "ENTRY",
      message: row.exit_time ? "Uscita" : "Ingresso",
      timestamp: row.entry_time,
    })) ?? []
  );
}
