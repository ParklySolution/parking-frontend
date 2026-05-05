import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantAdmin } from "../middleware/role.middleware.js";
import { 
  getTenantBrandsController,
  createTenantBrandController,
  toggleTenantBrandController,
  getTenantCategoriesController,
  createTenantCategoryController,
  toggleTenantCategoryController,
  getTenantModelsController,
  createTenantModelController,
  toggleTenantModelController,
  updateModelCategoryController,
  inviteOperatorController  // 🔥 NUOVO IMPORT PER INVITARE OPERATORI
} from "../controllers/tenant.controller.js";

const router = Router();

// Applica authMiddleware a tutte le route tenant
router.use(authMiddleware);

// ============================================================================
// TENANT VEHICLE BRANDS
// ============================================================================

// GET /api/tenant/:tenantId/brands
router.get("/:tenantId/brands", getTenantBrandsController);

// POST /api/tenant/:tenantId/brands
router.post("/:tenantId/brands", createTenantBrandController);

// PUT /api/tenant/:tenantId/brands/:brandId/toggle
router.put("/:tenantId/brands/:brandId/toggle", toggleTenantBrandController);

// ============================================================================
// TENANT VEHICLE CATEGORIES
// ============================================================================

// GET /api/tenant/:tenantId/categories
router.get("/:tenantId/categories", getTenantCategoriesController);

// POST /api/tenant/:tenantId/categories
router.post("/:tenantId/categories", createTenantCategoryController);

// PUT /api/tenant/:tenantId/categories/:categoryId/toggle
router.put("/:tenantId/categories/:categoryId/toggle", toggleTenantCategoryController);

// ============================================================================
// TENANT VEHICLE MODELS
// ============================================================================

// GET /api/tenant/:tenantId/models
router.get("/:tenantId/models", getTenantModelsController);

// POST /api/tenant/:tenantId/models
router.post("/:tenantId/models", createTenantModelController);

// PUT /api/tenant/:tenantId/models/:modelId/toggle
router.put("/:tenantId/models/:modelId/toggle", toggleTenantModelController);

// PUT /api/tenant/:tenantId/models/:modelId/category
router.put("/:tenantId/models/:modelId/category", updateModelCategoryController);

// ============================================================================
// TENANT OPERATOR INVITE
// ============================================================================

// POST /api/tenant/:tenantId/invite-operator
router.post("/:tenantId/invite-operator", requireTenantAdmin, inviteOperatorController);

export default router;