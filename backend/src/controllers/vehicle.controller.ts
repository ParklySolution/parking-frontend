// backend/src/controllers/vehicle.controller.ts
import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// Estendiamo il tipo Request per includere user
interface AuthRequest extends Request {
  user?: any;
  tenantId?: string;
}

/**
 * GET /api/vehicles/models
 * Restituisce tutti i modelli per un tenant (con paginazione)
 */
export async function getVehicleModels(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId || req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId non disponibile" });
    }

    console.log("🔍 getVehicleModels per tenant:", tenantId);

    // 🔥 PAGINAZIONE: ottieni TUTTI i modelli (senza limiti)
    let allModels: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("vehicle_models")
        .select("id, name, brand_id, category_id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("❌ Errore query:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        allModels = [...allModels, ...data];
        page++;
      }
      
      hasMore = data && data.length === pageSize;
    }

    console.log(`✅ Trovati ${allModels.length} modelli totali`);
    
    // Verifica se Stelvio è nel risultato
    const stelvioInResults = allModels?.find(m => m.name === 'Stelvio');
    console.log("Stelvio nei risultati:", stelvioInResults ? "SÌ" : "NO");

    // Recupera marche e categorie
    const { data: brands } = await supabase
      .from("vehicle_brands")
      .select("id, name")
      .eq("tenant_id", tenantId);
    
    const { data: categories } = await supabase
      .from("vehicle_categories")
      .select("id, name")
      .eq("tenant_id", tenantId);

    const brandMap = new Map(brands?.map(b => [b.id, b.name]));
    const categoryMap = new Map(categories?.map(c => [c.id, c.name]));

    const formattedModels = allModels?.map(m => ({
      id: m.id,
      name: m.name,
      brand_id: m.brand_id,
      brand_name: brandMap.get(m.brand_id) || "Sconosciuto",
      category_id: m.category_id,
      category_name: categoryMap.get(m.category_id) || "Sconosciuto"
    }));

    return res.json({ success: true, data: formattedModels });

  } catch (error) {
    console.error("❌ Errore GET:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/vehicles/models/:id/category
 */
export async function updateModelCategory(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;
    const tenantId = req.user?.user_metadata?.tenant_id || 
                     req.user?.app_metadata?.tenant_id;

    console.log("📝 Aggiornamento categoria:", { id, tenantId, categoryId });

    if (!tenantId) {
      return res.status(401).json({ error: "Utente non autenticato" });
    }

    if (!categoryId || !id) {
      return res.status(400).json({ error: "categoryId e id sono obbligatori" });
    }

    const { data, error } = await supabase
      .from("vehicle_models")
      .update({ category_id: categoryId, updated_at: new Date() })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });

  } catch (error) {
    console.error("❌ Errore PUT:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vehicles/categories
 */
export async function getVehicleCategories(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.user_metadata?.tenant_id || 
                     req.user?.app_metadata?.tenant_id ||
                     req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId non disponibile" });
    }

    const { data, error } = await supabase
      .from("vehicle_categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    console.log(`✅ Trovate ${data?.length || 0} categorie`);

    return res.json({ success: true, data });

  } catch (error) {
    console.error("❌ Errore GET categories:", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/vehicles/brands
 */
export async function getVehicleBrands(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.user_metadata?.tenant_id || 
                     req.user?.app_metadata?.tenant_id ||
                     req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId non disponibile" });
    }

    const { data, error } = await supabase
      .from("vehicle_brands")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    console.log(`✅ Trovate ${data?.length || 0} marche`);

    return res.json({ success: true, data });

  } catch (error) {
    console.error("❌ Errore GET brands:", error);
    return res.status(500).json({ error: error.message });
  }
}