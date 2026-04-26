// frontend/src/services/auditLog.ts
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function logAudit({ action, entity, entity_id, details = {} }: {
  action: string;
  entity: string;
  entity_id?: string | null;
  details?: any;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn("⚠️ Nessun token, impossibile loggare audit");
      return;
    }

    console.log("🔐 TOKEN PER LOG-AUDIT (backend):", token?.substring(0, 50) + "...");
    console.log("📝 LOG DATA:", { action, entity, entity_id, details });

    // 🔥 CHIAMA IL BACKEND NODE INVECE DELL'EDGE FUNCTION
    const response = await fetch(`${API_URL}/api/superadmin/audit/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        entity,
        entity_id: entity_id || null,
        details,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Errore audit log (backend):", error);
      return;
    }

    const data = await response.json();
    console.log("✅ Audit log inviato con successo:", data);
    
    return data;
  } catch (err) {
    console.error("❌ Errore critico invio audit log:", err);
  }
}