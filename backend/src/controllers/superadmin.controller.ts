import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";  // ← CAMBIA DA services A config

export async function createTenantAdminController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { full_name, email } = req.body;

    console.log("📥 createTenantAdminController:", { tenantId, full_name, email });

    // Validazioni
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "email è richiesta"
      });
    }

    if (!full_name) {
      return res.status(400).json({
        success: false,
        error: "full_name è richiesto"
      });
    }

    // 1. Verifica che il tenant esista
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, company_id")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("❌ Tenant non trovato:", tenantError);
      return res.status(404).json({
        success: false,
        error: "Tenant non trovato"
      });
    }

    // 2. Genera password temporanea
    const tempPassword = Math.random().toString(36).slice(-12) + "!Aa1";

    // 3. Crea utente in auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: "tenant_admin",
        tenant_id: tenantId
      }
    });

    if (authError) {
      console.error("❌ Errore creazione auth:", authError);
      
      if (authError.message?.includes("already been registered")) {
        return res.status(409).json({
          success: false,
          error: "Email già registrata"
        });
      }
      
      throw authError;
    }

    console.log("✅ Utente auth creato:", authUser.user.id);

    // 4. Crea profilo
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUser.user.id,
        email: email,
        full_name: full_name,
        role: "tenant_admin",
        tenant_id: tenantId,
        company_id: tenant.company_id,
        is_active: true
      });

    if (profileError) {
      console.error("❌ Errore profilo:", profileError);
      // Rollback: cancella l'utente auth
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    console.log("✅ Profilo creato");

    // 5. Risposta di successo
    return res.status(201).json({
      success: true,
      message: "Tenant admin creato con successo",
      data: {
        user_id: authUser.user.id,
        email: email,
        full_name: full_name,
        temporary_password: tempPassword,
        tenant_id: tenantId,
        tenant_name: tenant.name
      }
    });

  } catch (err: any) {
    console.error("❌ ERRORE createTenantAdminController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore interno del server"
    });
  }
}