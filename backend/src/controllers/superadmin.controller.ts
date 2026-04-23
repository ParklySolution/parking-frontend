import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";

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

    // 1. Verifica che il tenant esista (usa admin_tenants)
    const { data: tenant, error: tenantError } = await supabase
      .from("admin_tenants")
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

    console.log("✅ Tenant trovato:", tenant.id, tenant.name);

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

    // 4. Dividi il nome completo in nome e cognome
    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // 5. Crea profilo in admin_profiles con le colonne corrette
    const { error: profileError } = await supabase
      .from("admin_profiles")
      .insert({
        auth_user_id: authUser.user.id,  // ← Collega all'utente auth
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: "tenant_admin",
        company_id: tenant.company_id
        // NOTA: tenant_id e is_active NON esistono in questa tabella
      });

    if (profileError) {
      console.error("❌ Errore profilo:", profileError);
      // Rollback: cancella l'utente auth
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    console.log("✅ Profilo creato in admin_profiles");

    // 6. Risposta di successo
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