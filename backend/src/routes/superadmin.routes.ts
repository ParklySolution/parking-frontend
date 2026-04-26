import { Router } from "express";
import { 
  createTenantAdminController,
  getUserProfileController,
  getCurrentUserController,
  impersonateUserController   // 🔥 AGGIUNGI QUESTO IMPORT
} from "../controllers/superadmin.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireSuperAdmin } from "../middleware/role.middleware.js";

const router = Router();

// ============================================================================
// TENANT ADMIN MANAGEMENT
// ============================================================================

// POST /api/superadmin/tenants/:tenantId/create-tenant-admin
router.post(
  "/tenants/:tenantId/create-tenant-admin",
  authMiddleware,
  requireSuperAdmin,
  createTenantAdminController
);

// ============================================================================
// USER PROFILE (per frontend)
// ============================================================================

// GET /api/superadmin/profile/:userId
router.get(
  "/profile/:userId",
  authMiddleware,
  getUserProfileController
);

// GET /api/superadmin/me
router.get(
  "/me",
  authMiddleware,
  getCurrentUserController
);

// ============================================================================
// IMPERSONATION 🔥 NUOVA ROUTE - DEVI AGGIUNGERE QUESTO
// ============================================================================

// POST /api/superadmin/impersonate/:userId
router.post(
  "/impersonate/:userId",
  authMiddleware,
  requireSuperAdmin,
  impersonateUserController
);

export default router;