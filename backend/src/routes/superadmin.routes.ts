import { Router } from "express";
import { 
  createTenantAdminController,
  getUserProfileController,
  getCurrentUserController,
  impersonateUserController,
  logAuditController,
  getAllProfilesController,
  getTenantsListController,
  getGlobalBrandsController,
  createGlobalBrandController,
  updateGlobalBrandController,
  deleteGlobalBrandController,
  getGlobalCategoriesController,
  createGlobalCategoryController,
  updateGlobalCategoryController,
  deleteGlobalCategoryController,  // ← punto e virgola, non punto e virgola + punto e virgola
  syncAllGlobalModelsController,
  syncBrandModelsController,
  getGlobalModelsController,
  updateGlobalModelCategoryController,
  toggleGlobalModelController
} from "../controllers/superadmin.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireSuperAdmin } from "../middleware/role.middleware.js";

const router = Router();

// ============================================================================
// TENANT ADMIN MANAGEMENT
// ============================================================================
router.post(
  "/tenants/:tenantId/create-tenant-admin",
  authMiddleware,
  requireSuperAdmin,
  createTenantAdminController
);

// ============================================================================
// USER PROFILE
// ============================================================================
router.get(
  "/profile/:userId",
  authMiddleware,
  getUserProfileController
);

router.get(
  "/me",
  authMiddleware,
  getCurrentUserController
);

// ============================================================================
// IMPERSONATION
// ============================================================================
router.post(
  "/impersonate/:userId",
  authMiddleware,
  requireSuperAdmin,
  impersonateUserController
);

// ============================================================================
// AUDIT LOG
// ============================================================================
router.post(
  "/audit/log",
  authMiddleware,
  logAuditController
);

// ============================================================================
// PROFILES (per AuditLogPage)
// ============================================================================
router.get(
  "/profiles/all",
  authMiddleware,
  getAllProfilesController
);

// ============================================================================
// TENANTS LIST (per AuditLogPage)
// ============================================================================
router.get(
  "/tenants-list",
  authMiddleware,
  getTenantsListController
);

// ============================================================================
// GLOBAL VEHICLE BRANDS (SuperAdmin)
// ============================================================================
router.get("/global-brands", authMiddleware, requireSuperAdmin, getGlobalBrandsController);
router.post("/global-brands", authMiddleware, requireSuperAdmin, createGlobalBrandController);
router.put("/global-brands/:brandId", authMiddleware, requireSuperAdmin, updateGlobalBrandController);
router.delete("/global-brands/:brandId", authMiddleware, requireSuperAdmin, deleteGlobalBrandController);

// ============================================================================
// GLOBAL VEHICLE CATEGORIES (SuperAdmin)
// ============================================================================
router.get("/global-categories", authMiddleware, requireSuperAdmin, getGlobalCategoriesController);
router.post("/global-categories", authMiddleware, requireSuperAdmin, createGlobalCategoryController);
router.put("/global-categories/:categoryId", authMiddleware, requireSuperAdmin, updateGlobalCategoryController);
router.delete("/global-categories/:categoryId", authMiddleware, requireSuperAdmin, deleteGlobalCategoryController);

// ============================================================================
// GLOBAL VEHICLE MODELS SYNC
// ============================================================================
router.post("/global-models/sync-all", authMiddleware, requireSuperAdmin, syncAllGlobalModelsController);
router.post("/global-models/sync-brand/:brandId", authMiddleware, requireSuperAdmin, syncBrandModelsController);

// ============================================================================
// GLOBAL VEHICLE MODELS (SuperAdmin)
// ============================================================================
router.get("/global-models", authMiddleware, requireSuperAdmin, getGlobalModelsController);
router.put("/global-models/:modelId/category", authMiddleware, requireSuperAdmin, updateGlobalModelCategoryController);
router.put("/global-models/:modelId/toggle", authMiddleware, requireSuperAdmin, toggleGlobalModelController);

export default router;