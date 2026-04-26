import { supabase } from "./supabase";

export async function exitImpersonation() {
  try {
    const originalSessionStr = localStorage.getItem("superadmin_original_session");
    
    if (!originalSessionStr) {
      console.error("❌ Nessuna sessione originale trovata");
      return false;
    }

    const originalSession = JSON.parse(originalSessionStr);
    
    const { error } = await supabase.auth.setSession({
      access_token: originalSession.access_token,
      refresh_token: originalSession.refresh_token,
    });

    if (error) {
      console.error("❌ Errore uscita impersonation:", error);
      return false;
    }

    // Pulisci localStorage
    localStorage.removeItem("superadmin_original_session");
    localStorage.removeItem("is_impersonating");
    localStorage.removeItem("impersonated_tenant_name");
    localStorage.removeItem("impersonated_tenant_id");

    console.log("✅ Uscita impersonation completata");
    return true;
  } catch (err) {
    console.error("❌ Eccezione exitImpersonation:", err);
    return false;
  }
}
