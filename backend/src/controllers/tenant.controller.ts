import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ============================================================================
// TENANT VEHICLE BRANDS
// ============================================================================

// GET /api/tenant/:tenantId/brands
export async function getTenantBrandsController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    console.log("📥 [getTenantBrandsController] tenantId:", tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    const { data: brands, error } = await supabase
      .from("tenant_vehicle_brands")
      .select("id, global_brand_id, name, is_active, is_custom")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      console.error("❌ Errore recupero marche:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ [getTenantBrandsController] Trovate ${brands?.length || 0} marche`);

    return res.status(200).json({
      success: true,
      data: brands || []
    });

  } catch (err: any) {
    console.error("❌ ERRORE getTenantBrandsController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// POST /api/tenant/:tenantId/brands
export async function createTenantBrandController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { name } = req.body;

    console.log("📥 [createTenantBrandController] tenantId:", tenantId, "name:", name);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name è richiesto"
      });
    }

    const { data: existing } = await supabase
      .from("tenant_vehicle_brands")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Una marca con questo nome esiste già"
      });
    }

    const { data: brand, error } = await supabase
      .from("tenant_vehicle_brands")
      .insert({
        tenant_id: tenantId,
        name,
        is_active: true,
        is_custom: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore creazione marca:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [createTenantBrandController] Marca creata:", brand.id);

    return res.status(201).json({
      success: true,
      data: brand
    });

  } catch (err: any) {
    console.error("❌ ERRORE createTenantBrandController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/tenant/:tenantId/brands/:brandId/toggle
export async function toggleTenantBrandController(req: Request, res: Response) {
  try {
    const { tenantId, brandId } = req.params;
    const { is_active } = req.body;

    console.log("📥 [toggleTenantBrandController] brandId:", brandId, "is_active:", is_active);

    if (!brandId) {
      return res.status(400).json({
        success: false,
        error: "brandId è richiesto"
      });
    }

    const { error } = await supabase
      .from("tenant_vehicle_brands")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", brandId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("❌ Errore toggle marca:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [toggleTenantBrandController] Toggle completato");

    return res.status(200).json({
      success: true,
      message: "Marca aggiornata"
    });

  } catch (err: any) {
    console.error("❌ ERRORE toggleTenantBrandController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// TENANT VEHICLE CATEGORIES
// ============================================================================

// GET /api/tenant/:tenantId/categories
export async function getTenantCategoriesController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    console.log("📥 [getTenantCategoriesController] tenantId:", tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    const { data: categories, error } = await supabase
      .from("tenant_vehicle_categories")
      .select("id, global_category_id, name, is_active, is_custom")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      console.error("❌ Errore recupero categorie:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`✅ [getTenantCategoriesController] Trovate ${categories?.length || 0} categorie`);

    return res.status(200).json({
      success: true,
      data: categories || []
    });

  } catch (err: any) {
    console.error("❌ ERRORE getTenantCategoriesController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// POST /api/tenant/:tenantId/categories
export async function createTenantCategoryController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { name } = req.body;

    console.log("📥 [createTenantCategoryController] tenantId:", tenantId, "name:", name);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name è richiesto"
      });
    }

    const { data: existing } = await supabase
      .from("tenant_vehicle_categories")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Una categoria con questo nome esiste già"
      });
    }

    const { data: category, error } = await supabase
      .from("tenant_vehicle_categories")
      .insert({
        tenant_id: tenantId,
        name,
        is_active: true,
        is_custom: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore creazione categoria:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [createTenantCategoryController] Categoria creata:", category.id);

    return res.status(201).json({
      success: true,
      data: category
    });

  } catch (err: any) {
    console.error("❌ ERRORE createTenantCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/tenant/:tenantId/categories/:categoryId/toggle
export async function toggleTenantCategoryController(req: Request, res: Response) {
  try {
    const { tenantId, categoryId } = req.params;
    const { is_active } = req.body;

    console.log("📥 [toggleTenantCategoryController] categoryId:", categoryId, "is_active:", is_active);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: "categoryId è richiesto"
      });
    }

    const { error } = await supabase
      .from("tenant_vehicle_categories")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", categoryId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("❌ Errore toggle categoria:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [toggleTenantCategoryController] Toggle completato");

    return res.status(200).json({
      success: true,
      message: "Categoria aggiornata"
    });

  } catch (err: any) {
    console.error("❌ ERRORE toggleTenantCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// TENANT VEHICLE MODELS
// ============================================================================

// GET /api/tenant/:tenantId/models
export async function getTenantModelsController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    console.log("📥 [getTenantModelsController] tenantId:", tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    // 🔥 PAGINAZIONE PER PRENDERE TUTTI I RECORD
    let allModels: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: batch, error } = await supabase
        .from("tenant_vehicle_models")
        .select("*")
        .eq("tenant_id", tenantId)
        .range(from, to);
      
      if (error) {
        console.error("❌ Errore recupero modelli (pagina", page, "):", error);
        break;
      }
      
      if (batch && batch.length > 0) {
        allModels.push(...batch);
        page++;
      }
      
      if (!batch || batch.length < pageSize) {
        hasMore = false;
      }
    }

    console.log(`📊 Trovati ${allModels.length} modelli (paginate, ${page} pagine)`);

    // Verifica modello specifico
    const tipoWagonRaw = allModels.find(m => m.name === 'Tipo Station Wagon');
    console.log("🔍 'Tipo Station Wagon' nei dati grezzi:", tipoWagonRaw ? "✅ SÌ" : "❌ NO");

    // Recupera brand
    const { data: brands, error: brandsError } = await supabase
      .from("tenant_vehicle_brands")
      .select("id, name")
      .eq("tenant_id", tenantId);

    if (brandsError) {
      console.error("❌ Errore recupero brand:", brandsError);
    }

    // Recupera categorie
    const { data: categories, error: categoriesError } = await supabase
      .from("tenant_vehicle_categories")
      .select("id, name")
      .eq("tenant_id", tenantId);

    if (categoriesError) {
      console.error("❌ Errore recupero categorie:", categoriesError);
    }

    const brandMap = new Map();
    brands?.forEach(b => brandMap.set(b.id, b.name));

    const categoryMap = new Map();
    categories?.forEach(c => categoryMap.set(c.id, c.name));

    const enrichedModels = allModels.map(model => ({
      ...model,
      brand_name: brandMap.get(model.brand_id) || "Marca sconosciuta",
      category_name: categoryMap.get(model.category_id) || null
    }));

    enrichedModels.sort((a, b) => {
      if (a.brand_name !== b.brand_name) {
        return a.brand_name.localeCompare(b.brand_name);
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ [getTenantModelsController] Inviando ${enrichedModels.length} modelli`);

    return res.status(200).json({
      success: true,
      data: enrichedModels
    });

  } catch (err: any) {
    console.error("❌ ERRORE getTenantModelsController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// POST /api/tenant/:tenantId/models
export async function createTenantModelController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { brand_id, category_id, name } = req.body;

    console.log("📥 [createTenantModelController] tenantId:", tenantId, "brand_id:", brand_id, "category_id:", category_id, "name:", name);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    if (!brand_id) {
      return res.status(400).json({
        success: false,
        error: "brand_id è richiesto"
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        error: "category_id è richiesto"
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name è richiesto"
      });
    }

    // Verifica che la marca appartenga al tenant
    const { data: brand, error: brandError } = await supabase
      .from("tenant_vehicle_brands")
      .select("id")
      .eq("id", brand_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (brandError || !brand) {
      return res.status(404).json({
        success: false,
        error: "Marca non trovata per questo tenant"
      });
    }

    // Verifica che la categoria appartenga al tenant
    const { data: category, error: categoryError } = await supabase
      .from("tenant_vehicle_categories")
      .select("id")
      .eq("id", category_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (categoryError || !category) {
      return res.status(404).json({
        success: false,
        error: "Categoria non trovata per questo tenant"
      });
    }

    // Verifica se esiste già un modello con questo nome per questa marca
    const { data: existing } = await supabase
      .from("tenant_vehicle_models")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("brand_id", brand_id)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Un modello con questo nome esiste già per questa marca"
      });
    }

    const { data: model, error } = await supabase
      .from("tenant_vehicle_models")
      .insert({
        tenant_id: tenantId,
        brand_id,
        category_id,
        name,
        is_active: true,
        is_custom: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Errore creazione modello:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [createTenantModelController] Modello creato:", model.id);

    return res.status(201).json({
      success: true,
      data: model
    });

  } catch (err: any) {
    console.error("❌ ERRORE createTenantModelController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/tenant/:tenantId/models/:modelId/toggle
export async function toggleTenantModelController(req: Request, res: Response) {
  try {
    const { tenantId, modelId } = req.params;
    const { is_active } = req.body;

    console.log("📥 [toggleTenantModelController] modelId:", modelId, "is_active:", is_active);

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "modelId è richiesto"
      });
    }

    const { error } = await supabase
      .from("tenant_vehicle_models")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", modelId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("❌ Errore toggle modello:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [toggleTenantModelController] Toggle completato");

    return res.status(200).json({
      success: true,
      message: "Modello aggiornato"
    });

  } catch (err: any) {
    console.error("❌ ERRORE toggleTenantModelController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// PUT /api/tenant/:tenantId/models/:modelId/category
export async function updateModelCategoryController(req: Request, res: Response) {
  try {
    const { tenantId, modelId } = req.params;
    const { category_id } = req.body;

    console.log("📥 [updateModelCategoryController] modelId:", modelId, "category_id:", category_id);

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: "modelId è richiesto"
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        error: "category_id è richiesto"
      });
    }

    const { error } = await supabase
      .from("tenant_vehicle_models")
      .update({ category_id, updated_at: new Date().toISOString() })
      .eq("id", modelId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("❌ Errore aggiornamento categoria modello:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ [updateModelCategoryController] Categoria aggiornata");

    return res.status(200).json({
      success: true,
      message: "Categoria modello aggiornata"
    });

  } catch (err: any) {
    console.error("❌ ERRORE updateModelCategoryController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// INVITA OPERATORE (TENANT ADMIN)
// ============================================================================

export async function inviteOperatorController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { email, first_name, last_name, role } = req.body;

    console.log("📧 [inviteOperator] Creazione invito per:", email);
    console.log("📧 [inviteOperator] Tenant ID:", tenantId);

    if (!email || !first_name || !last_name) {
      return res.status(400).json({ error: "Email, nome e cognome richiesti" });
    }

    // 1. Verifica se l'utente esiste già
    let userId = null;
    let existingUser = null;

    try {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      existingUser = users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        console.log("✅ Utente già esistente:", userId);
      }
    } catch (err) {
      console.warn("⚠️ Errore listUsers, continuo...");
    }

    // 2. Crea l'utente se non esiste
    if (!userId) {
      const tempPassword = crypto.randomBytes(8).toString("hex") + "!Aa1";
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `${first_name} ${last_name}`,
          role: role || "operator",
          tenant_id: tenantId
        }
      });

      if (authError) {
        console.error("❌ Errore creazione utente:", authError);
        return res.status(500).json({ error: authError.message });
      }

      userId = authUser.user.id;
      console.log("✅ Utente creato:", userId);
    }

    // 3. Crea/aggiorna il profilo
    const { error: profileError } = await supabase
      .from("admin_profiles")
      .upsert({
        auth_user_id: userId,
        email: email,
        first_name: first_name,
        last_name: last_name,
        role: role || "operator",
        company_id: null
      }, { onConflict: "auth_user_id" });

    if (profileError) {
      console.error("❌ Errore profilo:", profileError);
      return res.status(500).json({ error: profileError.message });
    }

    // 4. CREA L'INVITO NELLA TABELLA user_invites
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const { error: inviteError } = await supabase
      .from("user_invites")
      .insert({
        token: inviteToken,
        email: email,
        user_id: userId,
        tenant_id: tenantId,
        role: role || "operator",
        expires_at: expiresAt.toISOString()
      });

    if (inviteError) {
      console.error("❌ Errore creazione invito:", inviteError);
      return res.status(500).json({ error: inviteError.message });
    }

    console.log("✅ Invito creato con token:", inviteToken);

    // 5. Invia email
    const inviteLink = `${FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    const { error: emailError } = await resend.emails.send({
      from: "Parkly <no-reply@park-ly.it>",
      to: [email],
      subject: "Sei stato invitato - Parkly",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6;">Parkly</h1>
          </div>
          
          <div style="background: #f0f7ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 16px;">Ciao <strong>${first_name} ${last_name}</strong>,</p>
            <p style="margin: 10px 0 0;">Sei stato invitato come <strong>${role || "operatore"}</strong> su Parkly.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
              Accetta l'invito
            </a>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            Link valido per 48 ore.<br>
            &copy; Parkly - Gestione parcheggi
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error("❌ Errore invio email:", emailError);
    } else {
      console.log("✅ Email inviata a:", email);
    }

    return res.status(201).json({
      success: true,
      message: "Operatore invitato con successo",
      data: {
        user_id: userId,
        email: email,
        invite_link: inviteLink
      }
    });

  } catch (err: any) {
    console.error("❌ ERRORE inviteOperatorController:", err);
    return res.status(500).json({ error: err.message });
  }
}