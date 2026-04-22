import { supabase } from "./supabase";
import type { PlateDecision } from "@/types/plate";

export async function routePlate(plate: string): Promise<PlateDecision> {
  // 1️⃣ controllo blocco (quando lo implementerai davvero)
  const { data: blockedData } = await supabase
    .rpc("is_plate_blocked", { p_plate: plate });

  if (blockedData === true) {
    return {
      plate,
      status: "BLOCKED",
      message: "Targa bloccata 🚫",
    };
  }

  // 2️⃣ controllo abbonamento ATTIVO
  const { data: subs, error } = await supabase
    .rpc("get_active_subscription_by_plate", {
      p_plate: plate,
    });

  if (error) {
    console.error("Errore verifica abbonamento:", error);
  }

  if (subs && subs.length > 0) {
    return {
      plate,
      status: "SUBSCRIBER",
      message: `Abbonato attivo fino al ${subs[0].end_date} ✅`,
    };
  }

  // 3️⃣ fallback
  return {
    plate,
    status: "OCCASIONAL",
    message: "Ingresso occasionale 🅿️",
  };
}
