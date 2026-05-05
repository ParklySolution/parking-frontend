import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { Resend } from "resend";
import { syncAllModels, syncModelsForBrand } from "../services/nhtsa.service.js";

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// CREATE TENANT ADMIN
// ============================================================================
export async function createTenantAdminController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { full_name, email } = req.body;

    console.log("📥 createTenantAdminController:", { tenantId, full_name, email });

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

    const tempPassword = Math.random().toString(36).slice(-12) + "!Aa1";

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

    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error: profileError } = await supabase
      .from("admin_profiles")
      .insert({
        auth_user_id: authUser.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: "tenant_admin",
        company_id: tenant.company_id
      });

    if (profileError) {
      console.error("❌ Errore profilo:", profileError);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    console.log("✅ Profilo creato in admin_profiles");

    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://tuo-dominio.com'
      : 'http://localhost:5173';

    const redirectUrl = `${frontendUrl}/auth/update-password`;

    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    let resetLink = `${frontendUrl}/auth/update-password?email=${encodeURIComponent(email)}&from_invite=true`;

    if (!magicLinkError && magicLinkData?.properties?.action_link) {
      resetLink = magicLinkData.properties.action_link;
      console.log("🔗 Magic link generato con successo");
    } else {
      console.warn("⚠️ Magic link non generato, uso fallback:", magicLinkError?.message);
    }

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Parkly <no-reply@park-ly.it>",
      to: [email],
      subject: "Benvenuto in Parkly - Imposta la tua password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a73e8; margin-bottom: 0;">Parkly</h1>
            <p style="color: #666; margin-top: 5px;">Gestione parcheggi professionale</p>
          </div>
          
          <div style="background: #f0f7ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 16px;">Ciao <strong style="color: #1a73e8;">${full_name}</strong>,</p>
            <p style="margin: 10px 0 0;">Sei stato invitato come <strong>Tenant Admin</strong> per il tenant <strong>${tenant.name}</strong>.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #1a73e8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
              Imposta la tua password
            </a>
          </div>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px; font-size: 14px;"><strong>⚡ Credenziali temporanee (se il pulsante non funziona):</strong></p>
            <ul style="margin: 0; font-size: 14px;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Password temporanea:</strong> <code style="background: #e0e0e0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></li>
            </ul>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #333;">
              <strong>🔐 Importante:</strong> Nel tenant admin potrai gestire prezzi, abbonamenti, clienti, veicoli, 
              lavaggi, report e tutte le operazioni del parcheggio. Dopo il primo accesso ti consigliamo di cambiare la password.
            </p>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            Questa email è stata inviata automaticamente da Parkly.<br>
            © Parkly - Gestione parcheggi
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error("❌ Errore invio email Resend:", emailError);
    } else {
      console.log("✅ Email inviata con Resend! ID:", emailData?.id);
    }

    return res.status(201).json({
      success: true,
      message: "Tenant admin creato con successo. Email inviata con le credenziali.",
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

// ============================================================================
// GET USER PROFILE
// ============================================================================
export async function getUserProfileController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    console.log("📥 getUserProfileController:", userId);
    
    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("auth_user_id, role, company_id, first_name, last_name, email")
      .eq("auth_user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("❌ Errore get profile:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    console.log("✅ Profilo trovato:", profile);
    
    return res.json({
      success: true,
      profile: profile
    });
    
  } catch (err: any) {
    console.error("❌ ERRORE getUserProfileController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// GET CURRENT USER
// ============================================================================
export async function getCurrentUserController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Non autenticato"
      });
    }
    
    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || profile?.role,
        tenant_id: user.user_metadata?.tenant_id || profile?.company_id
      },
      profile: profile
    });
    
  } catch (err: any) {
    console.error("❌ ERRORE getCurrentUserController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// IMPERSONATION
// ============================================================================
export async function impersonateUserController(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    console.log("🕵️ [impersonateUserController] Richiesta per tenantId:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId è richiesto"
      });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("admin_tenants")
      .select("id, name, owner_user_id")
      .eq("id", userId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return res.status(404).json({
        success: false,
        error: "Tenant non trovato"
      });
    }

    if (!tenant.owner_user_id) {
      return res.status(400).json({
        success: false,
        error: "Questo tenant non ha un owner_user_id valido"
      });
    }

    console.log("✅ Tenant trovato:", tenant.name);
    console.log("✅ owner_user_id:", tenant.owner_user_id);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(tenant.owner_user_id);

    if (userError || !userData.user) {
      return res.status(404).json({
        success: false,
        error: "Utente da impersonare non trovato"
      });
    }

    console.log("✅ Utente da impersonare:", userData.user.email);

    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://tuo-dominio.com'
      : 'http://localhost:5173';

    const { data: magicLink, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: `${frontendUrl}/auth/impersonate-callback?tenant_id=${tenant.id}`
      }
    });

    if (magicError) {
      console.error("❌ Errore generazione magic link:", magicError);
      return res.status(500).json({
        success: false,
        error: magicError.message
      });
    }

    const magicLinkUrl = magicLink.properties?.action_link;
    
    if (!magicLinkUrl) {
      return res.status(500).json({
        success: false,
        error: "Impossibile generare il magic link"
      });
    }

    console.log("✅ Magic link generato:", magicLinkUrl);

    return res.status(200).json({
      success: true,
      magic_link: magicLinkUrl,
      tenant_id: tenant.id,
      user_email: userData.user.email
    });

  } catch (err: any) {
    console.error("❌ ERRORE impersonateUserController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore interno del server"
    });
  }
}

// ============================================================================
// AUDIT LOG - REGISTRA AZIONI UTENTI
// ============================================================================
export async function logAuditController(req: Request, res: Response) {
  try {
    const { action, entity, entity_id, details } = req.body;
    const user = (req as any).user;

    console.log("📝 [logAuditController] Azione:", action);
    console.log("📝 [logAuditController] Utente:", user?.id, user?.email);

    if (!action) {
      return res.status(400).json({
        success: false,
        error: "action è richiesto"
      });
    }

    if (!entity) {
      return res.status(400).json({
        success: false,
        error: "entity è richiesto"
      });
    }

    const { error: insertError } = await supabase
      .from("audit_log")
      .insert({
        action,
        entity,
        entity_id: entity_id || null,
        metadata: details || {},
        performed_by: user?.id || null,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("❌ Errore inserimento audit log:", insertError);
      return res.status(500).json({
        success: false,
        error: insertError.message
      });
    }

    console.log("✅ Audit log registrato con successo");

    return res.status(200).json({
      success: true,
      message: "Audit log registrato"
    });

  } catch (err: any) {
    console.error("❌ ERRORE logAuditController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore interno del server"
    });
  }
}

// ============================================================================
// GET ALL PROFILES (per AuditLogPage)
// ============================================================================
export async function getAllProfilesController(req: Request, res: Response) {
  try {
    console.log("📥 [getAllProfilesController] Richiesta ricevuta");

    const { data: profiles, error } = await supabase
      .from("admin_profiles")
      .select("auth_user_id, first_name, last_name, email, role, company_id");

    if (error) {
      console.error("❌ Errore recupero profili:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ [getAllProfilesController] Trovati ${profiles?.length || 0} profili`);

    return res.status(200).json({
      success: true,
      profiles: profiles || []
    });

  } catch (err: any) {
    console.error("❌ ERRORE getAllProfilesController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// GET ALL TENANTS (per AuditLogPage)
// ============================================================================
export async function getTenantsListController(req: Request, res: Response) {
  try {
    console.log("📥 [getTenantsListController] Richiesta ricevuta");

    const { data: tenants, error } = await supabase
      .from("admin_tenants")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("❌ Errore recupero tenants:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ [getTenantsListController] Trovati ${tenants?.length || 0} tenant`);

    return res.status(200).json({
      success: true,
      data: tenants || []
    });

  } catch (err: any) {
    console.error("❌ ERRORE getTenantsListController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// GLOBAL VEHICLE BRANDS (SuperAdmin)
// ============================================================================

// GET /api/superadmin/global-brands
export async function getGlobalBrandsController(req: Request, res: Response) {
  try {
    console.log("📥 [getGlobalBrandsController]");

    const { data: brands, error } = await supabase
      .from("global_vehicle_brands")
      .select("*")
      .order("order", { ascending: true })
      .order("name");

    if (error) {
      console.error("❌ Errore recupero marche globali:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ [getGlobalBrandsController] Trovate ${brands?.length || 0} marche`);

    return res.status(200).json({
      success: true,
      data: brands || []
    });

  } catch (err: any) {
    console.error("❌ ERRORE getGlobalBrandsController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// POST /api/superadmin/global-brands
export async function createGlobalBrandController(req: Request, res: Response) {
  try {
    const { name, order } = req.body;

    console.log("📥 [createGlobalBrandController] name:", name, "order:", order);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name è richiesto"
      });
    }

    // Verifica se esiste già
    const { data: existing } = await supabase
      .from("global_vehicle_brands")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Una marca con questo nome esiste già"
      });
    }

    const { data: brand, error } = await supabase
      .from("global_vehicle_brands")
      .insert({
        name,
        order: order || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore creazione marca globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [createGlobalBrandController] Marca creata:", brand.id);

    return res.status(201).json({
      success: true,
      data: brand
    });

  } catch (err: any) {
    console.error("❌ ERRORE createGlobalBrandController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/superadmin/global-brands/:brandId
export async function updateGlobalBrandController(req: Request, res: Response) {
  try {
    const { brandId } = req.params;
    const { name, order, is_active } = req.body;

    console.log("📥 [updateGlobalBrandController] brandId:", brandId);

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (order !== undefined) updates.order = order;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("global_vehicle_brands")
      .update(updates)
      .eq("id", brandId);

    if (error) {
      console.error("❌ Errore aggiornamento marca globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [updateGlobalBrandController] Marca aggiornata");

    return res.status(200).json({
      success: true,
      message: "Marca aggiornata con successo"
    });

  } catch (err: any) {
    console.error("❌ ERRORE updateGlobalBrandController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// DELETE /api/superadmin/global-brands/:brandId
export async function deleteGlobalBrandController(req: Request, res: Response) {
  try {
    const { brandId } = req.params;

    console.log("📥 [deleteGlobalBrandController] brandId:", brandId);

    // Verifica se ci sono modelli associati
    const { count, error: countError } = await supabase
      .from("global_vehicle_models")
      .select("*", { count: 'exact', head: true })
      .eq("brand_id", brandId);

    if (count && count > 0) {
      return res.status(409).json({
        success: false,
        error: `Impossibile eliminare: ci sono ${count} modelli associati a questa marca. Elimina prima i modelli.`
      });
    }

    const { error } = await supabase
      .from("global_vehicle_brands")
      .delete()
      .eq("id", brandId);

    if (error) {
      console.error("❌ Errore eliminazione marca globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [deleteGlobalBrandController] Marca eliminata");

    return res.status(200).json({
      success: true,
      message: "Marca eliminata con successo"
    });

  } catch (err: any) {
    console.error("❌ ERRORE deleteGlobalBrandController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// GLOBAL VEHICLE CATEGORIES (SuperAdmin)
// ============================================================================

// GET /api/superadmin/global-categories
export async function getGlobalCategoriesController(req: Request, res: Response) {
  try {
    console.log("📥 [getGlobalCategoriesController]");

    const { data: categories, error } = await supabase
      .from("global_vehicle_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("❌ Errore recupero categorie globali:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ [getGlobalCategoriesController] Trovate ${categories?.length || 0} categorie`);

    return res.status(200).json({
      success: true,
      data: categories || []
    });

  } catch (err: any) {
    console.error("❌ ERRORE getGlobalCategoriesController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// POST /api/superadmin/global-categories
export async function createGlobalCategoryController(req: Request, res: Response) {
  try {
    const { name } = req.body;

    console.log("📥 [createGlobalCategoryController] name:", name);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name è richiesto"
      });
    }

    // Verifica se esiste già
    const { data: existing } = await supabase
      .from("global_vehicle_categories")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Una categoria con questo nome esiste già"
      });
    }

    const { data: category, error } = await supabase
      .from("global_vehicle_categories")
      .insert({
        name,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore creazione categoria globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [createGlobalCategoryController] Categoria creata:", category.id);

    return res.status(201).json({
      success: true,
      data: category
    });

  } catch (err: any) {
    console.error("❌ ERRORE createGlobalCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/superadmin/global-categories/:categoryId
export async function updateGlobalCategoryController(req: Request, res: Response) {
  try {
    const { categoryId } = req.params;
    const { name, is_active } = req.body;

    console.log("📥 [updateGlobalCategoryController] categoryId:", categoryId);

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("global_vehicle_categories")
      .update(updates)
      .eq("id", categoryId);

    if (error) {
      console.error("❌ Errore aggiornamento categoria globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [updateGlobalCategoryController] Categoria aggiornata");

    return res.status(200).json({
      success: true,
      message: "Categoria aggiornata con successo"
    });

  } catch (err: any) {
    console.error("❌ ERRORE updateGlobalCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// DELETE /api/superadmin/global-categories/:categoryId
export async function deleteGlobalCategoryController(req: Request, res: Response) {
  try {
    const { categoryId } = req.params;

    console.log("📥 [deleteGlobalCategoryController] categoryId:", categoryId);

    const { error } = await supabase
      .from("global_vehicle_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      console.error("❌ Errore eliminazione categoria globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [deleteGlobalCategoryController] Categoria eliminata");

    return res.status(200).json({
      success: true,
      message: "Categoria eliminata con successo"
    });

  } catch (err: any) {
    console.error("❌ ERRORE deleteGlobalCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// GLOBAL VEHICLE MODELS SYNC (SuperAdmin)
// ============================================================================

// POST /api/superadmin/global-models/sync-all
export async function syncAllGlobalModelsController(req: Request, res: Response) {
  try {
    console.log("📥 [syncAllGlobalModelsController] Avvio sincronizzazione completa...");
    
    const result = await syncAllModels(supabase);
    
    return res.status(200).json({
      success: true,
      message: `Sincronizzazione completata`,
      data: {
        brands_processed: result.brands,
        new_models_added: result.total
      }
    });
    
  } catch (err: any) {
    console.error("❌ ERRORE syncAllGlobalModelsController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore durante la sincronizzazione"
    });
  }
}

// POST /api/superadmin/global-models/sync-brand/:brandId
export async function syncBrandModelsController(req: Request, res: Response) {
  try {
    const { brandId } = req.params;
    
    console.log(`📥 [syncBrandModelsController] Sincronizzazione per brandId: ${brandId}`);
    
    // Recupera la marca
    const { data: brand, error: brandError } = await supabase
      .from("global_vehicle_brands")
      .select("id, name")
      .eq("id", brandId)
      .single();
    
    if (brandError || !brand) {
      return res.status(404).json({
        success: false,
        error: "Marca non trovata"
      });
    }
    
    const inserted = await syncModelsForBrand(brand.id, brand.name, supabase);
    
    return res.status(200).json({
      success: true,
      message: `Sincronizzazione completata per ${brand.name}`,
      data: {
        brand_id: brand.id,
        brand_name: brand.name,
        new_models_added: inserted
      }
    });
    
  } catch (err: any) {
    console.error("❌ ERRORE syncBrandModelsController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore durante la sincronizzazione"
    });
  }
}

// ============================================================================
// GLOBAL VEHICLE MODELS (SuperAdmin)
// ============================================================================

// GET /api/superadmin/global-models
export async function getGlobalModelsController(req: Request, res: Response) {
  try {
    console.log("📥 [getGlobalModelsController]");

    // 🔥 PAGINAZIONE PER PRENDERE TUTTI I RECORD (Supera il limite di 1000)
    let allModels: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: batch, error } = await supabase
        .from("global_vehicle_models")
        .select("*")
        .order("name") // Mantengo l'ordine per sicurezza durante la paginazione
        .range(from, to);
      
      if (error) {
        console.error("❌ Errore recupero modelli globali (pagina", page, "):", error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      if (batch && batch.length > 0) {
        allModels.push(...batch);
        page++;
      }
      
      if (!batch || batch.length < pageSize) {
        hasMore = false;
      }
    }

    console.log(`📊 Trovati ${allModels.length} modelli globali (paginate, ${page} pagine)`);

    // Recupera marche per i nomi
    const { data: brands, error: brandsError } = await supabase
      .from("global_vehicle_brands")
      .select("id, name")
      .order("name");

    if (brandsError) {
      console.error("❌ Errore recupero marche globali:", brandsError);
    }

    // Recupera categorie per i nomi
    const { data: categories, error: categoriesError } = await supabase
      .from("global_vehicle_categories")
      .select("id, name")
      .order("name");

    if (categoriesError) {
      console.error("❌ Errore recupero categorie globali:", categoriesError);
    }

    const brandMap = new Map();
    brands?.forEach(b => brandMap.set(b.id, b.name));

    const categoryMap = new Map();
    categories?.forEach(c => categoryMap.set(c.id, c.name));

    // Arricchisci i modelli
    const enrichedModels = allModels.map(model => ({
      ...model,
      brand_name: brandMap.get(model.brand_id) || "Marca sconosciuta",
      category_name: categoryMap.get(model.default_category_id) || null
    }));

    // Ordina per marca, poi per modello
    enrichedModels.sort((a, b) => {
      if (a.brand_name !== b.brand_name) {
        return a.brand_name.localeCompare(b.brand_name);
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ [getGlobalModelsController] Trovati ed inviati ${enrichedModels.length} modelli globali`);

    return res.status(200).json({
      success: true,
      data: enrichedModels
    });
  } catch (err: any) {
    console.error("❌ ERRORE getGlobalModelsController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/superadmin/global-models/:modelId/category
export async function updateGlobalModelCategoryController(req: Request, res: Response) {
  try {
    const { modelId } = req.params;
    const { category_id } = req.body;

    console.log("📥 [updateGlobalModelCategoryController] modelId:", modelId, "category_id:", category_id);

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "modelId è richiesto"
      });
    }

    const { error } = await supabase
      .from("global_vehicle_models")
      .update({ default_category_id: category_id || null, updated_at: new Date().toISOString() })
      .eq("id", modelId);

    if (error) {
      console.error("❌ Errore aggiornamento categoria modello globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [updateGlobalModelCategoryController] Categoria aggiornata");

    return res.status(200).json({
      success: true,
      message: "Categoria modello globale aggiornata"
    });
  } catch (err: any) {
    console.error("❌ ERRORE updateGlobalModelCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/superadmin/global-models/:modelId/toggle
export async function toggleGlobalModelController(req: Request, res: Response) {
  try {
    const { modelId } = req.params;
    const { is_active } = req.body;

    console.log("📥 [toggleGlobalModelController] modelId:", modelId, "is_active:", is_active);

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "modelId è richiesto"
      });
    }

    const { error } = await supabase
      .from("global_vehicle_models")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", modelId);

    if (error) {
      console.error("❌ Errore toggle modello globale:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [toggleGlobalModelController] Toggle completato");

    return res.status(200).json({
      success: true,
      message: "Modello globale aggiornato"
    });
  } catch (err: any) {
    console.error("❌ ERRORE toggleGlobalModelController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// CSV IMPORT/EXPORT PER MODELLI GLOBALI
// ============================================================================

import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import path from "path";

// Configura multer per upload temporaneo
const upload = multer({ dest: "uploads/" });

// POST /api/superadmin/global-models/import-csv
export async function importGlobalModelsFromCSVController(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Nessun file CSV caricato"
      });
    }

    const results: any[] = [];
    const duplicates: any[] = [];
    const imported: any[] = [];
    const errors: any[] = [];

    // Leggi il CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`📄 CSV letto: ${results.length} righe`);
        
        for (const row of results) {
          try {
            // Verifica campi obbligatori
            if (!row.brand_name || !row.model_name) {
              errors.push({
                row,
                error: "Marca e nome modello sono obbligatori"
              });
              continue;
            }

            // 1. Trova o crea la marca
            let brandId = row.brand_id;
            if (!brandId) {
              let { data: existingBrand } = await supabase
                .from("global_vehicle_brands")
                .select("id, name")
                .eq("name", row.brand_name.trim())
                .single();

              if (!existingBrand) {
                const { data: newBrand, error: brandError } = await supabase
                  .from("global_vehicle_brands")
                  .insert({
                    name: row.brand_name.trim(),
                    is_active: row.brand_active !== undefined ? row.brand_active === "true" : true,
                    order: row.brand_order || 999
                  })
                  .select()
                  .single();

                if (brandError) {
                  errors.push({ row, error: `Errore creazione marca: ${brandError.message}` });
                  continue;
                }
                brandId = newBrand.id;
                console.log(`✅ Marca creata: ${row.brand_name}`);
              } else {
                brandId = existingBrand.id;
              }
            }

            // 2. Verifica se il modello esiste già
            const { data: existingModel } = await supabase
              .from("global_vehicle_models")
              .select("id, name")
              .eq("brand_id", brandId)
              .eq("name", row.model_name.trim())
              .single();

            if (existingModel) {
              duplicates.push({
                brand: row.brand_name,
                model: row.model_name,
                existing_id: existingModel.id
              });
              continue;
            }

            // 3. Trova categoria se specificata
            let categoryId = row.category_id;
            if (row.category_name && !categoryId) {
              const { data: existingCategory } = await supabase
                .from("global_vehicle_categories")
                .select("id")
                .eq("name", row.category_name.trim())
                .single();

              if (existingCategory) {
                categoryId = existingCategory.id;
              }
            }

            // 4. Crea il nuovo modello
            const { data: newModel, error: modelError } = await supabase
              .from("global_vehicle_models")
              .insert({
                brand_id: brandId,
                name: row.model_name.trim(),
                default_category_id: categoryId || null,
                is_active: row.is_active !== undefined ? row.is_active === "true" : true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (modelError) {
              errors.push({ row, error: modelError.message });
            } else {
              imported.push(newModel);
            }

          } catch (err: any) {
            errors.push({ row, error: err.message });
          }
        }

        // Pulisci file temporaneo
        fs.unlinkSync(req.file.path);

        console.log(`📊 Import completato: ${imported.length} importati, ${duplicates.length} duplicati, ${errors.length} errori`);

        return res.status(200).json({
          success: true,
          data: {
            imported: imported.length,
            duplicates: duplicates.length,
            errors: errors.length,
            duplicate_list: duplicates,
            error_list: errors,
            imported_models: imported
          },
          message: `Importazione completata: ${imported.length} modelli aggiunti, ${duplicates.length} duplicati ignorati`
        });
      });
      
  } catch (err: any) {
    console.error("❌ ERRORE importGlobalModelsFromCSVController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// GET /api/superadmin/global-models/export-csv
export async function exportGlobalModelsToCSVController(req: Request, res: Response) {
  try {
    console.log("📥 [exportGlobalModelsToCSVController]");

    // Recupera tutti i modelli
    let allModels: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: batch, error } = await supabase
        .from("global_vehicle_models")
        .select(`
          id,
          brand_id,
          name,
          default_category_id,
          is_active
        `)
        .range(from, to);
      
      if (error) break;
      
      if (batch && batch.length > 0) {
        allModels.push(...batch);
        page++;
      }
      
      if (!batch || batch.length < pageSize) {
        hasMore = false;
      }
    }

    // Recupera marche e categorie
    const { data: brands } = await supabase
      .from("global_vehicle_brands")
      .select("id, name");
    
    const { data: categories } = await supabase
      .from("global_vehicle_categories")
      .select("id, name");

    const brandMap = new Map(brands?.map(b => [b.id, b.name]));
    const categoryMap = new Map(categories?.map(c => [c.id, c.name]));

    // Prepara CSV
    const csvRows = [
      ["brand_name", "model_name", "category_name", "is_active"].join(",")
    ];

    for (const model of allModels) {
      const brandName = brandMap.get(model.brand_id) || "";
      const categoryName = categoryMap.get(model.default_category_id) || "";
      
      csvRows.push([
        `"${brandName}"`,
        `"${model.name}"`,
        `"${categoryName}"`,
        model.is_active ? "true" : "false"
      ].join(","));
    }

    const csvContent = csvRows.join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=global_models_export.csv");
    
    return res.send(csvContent);
    
  } catch (err: any) {
    console.error("❌ ERRORE exportGlobalModelsToCSVController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}