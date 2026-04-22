import { Router } from "express";
import { createTenantAdminController } from "../controllers/superadmin.controller.js";

const router = Router();

// POST /api/superadmin/tenants/:tenantId/create-tenant-admin
router.post(
  "/tenants/:tenantId/create-tenant-admin",
  createTenantAdminController  // ← TEMPORANEAMENTE SENZA MIDDLEWARE per test
);

export default router;