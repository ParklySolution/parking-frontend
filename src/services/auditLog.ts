// src/services/auditLog.ts
import { supabase } from "./supabase";

export async function logAudit({ action, entity, entity_id, details = {} }) {
  try {
    // Recupera la sessione corrente
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    console.log("🔐 TOKEN PER LOG-AUDIT:", token);

    // Invocazione Edge Function V2
    const { data, error } = await supabase.functions.invoke("log-audit", {
      body: {
        action,
        entity,
        entity_id,
        details,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Client-Info": "supabase-js-edge", // richiesto da Edge Functions V2
      },
    });

    if (error) {
      console.warn("⚠️ logAudit: errore funzione Edge:", error);
    }

    return data;
  } catch (err) {
    console.error("❌ Errore critico invio audit log:", err);
  }
}
