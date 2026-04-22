import { supabase } from "@/services/supabase";
import type { PlateDecision } from "@/types/plate";

type RpcResponse = {
  allowed: boolean;
  reason: string;
};

export async function checkPlateAccess(
  plate: string
): Promise<PlateDecision> {
  const { data, error } = await supabase.rpc("plate_access_decision", {
    p_plate: plate,
  });

  if (error) {
    console.error("RPC error:", error);
    throw error;
  }

  // 🛑 validazione risposta
  if (!data || typeof data !== "object") {
    throw new Error("Risposta RPC non valida");
  }

  const decision = data as RpcResponse;

  // 🔁 mapping DB → UI
  if (!decision.allowed && decision.reason === "blocked") {
    return {
      plate,
      status: "BLOCKED",
      message: "Targa bloccata 🚫",
    };
  }

  if (decision.allowed && decision.reason === "active_subscription") {
    return {
      plate,
      status: "SUBSCRIBER",
      message: "Abbonato riconosciuto ✅",
    };
  }

  return {
    plate,
    status: "OCCASIONAL",
    message: "Ingresso occasionale 🅿️",
  };
}
