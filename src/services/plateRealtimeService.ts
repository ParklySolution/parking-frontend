import { supabase } from "@/services/supabase";
import { checkPlateAccess } from "@/services/plateAccessService";
import type { PlateDecision } from "@/types/plate";

export function subscribeToPlateTransits(
  onDecision: (decision: PlateDecision) => void
) {
  const channel = supabase
    .channel("plate-transits")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "subscription_transits",
      },
      async (payload) => {
        const plate = payload.new.license_plate as string;
        if (!plate) return;

        try {
          const decision = await checkPlateAccess(plate);
          onDecision(decision);
        } catch (err) {
          console.error("Errore realtime plate access", err);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
