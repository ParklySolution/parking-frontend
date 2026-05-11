// backend/src/routes/vehicle.routes.ts
import { Router } from "express";
import { 
  getVehicleModels, 
  updateModelCategory,
  getVehicleCategories,
  getVehicleBrands
} from "../controllers/vehicle.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Tutte le route richiedono autenticazione
router.use(authMiddleware);

router.get("/models", getVehicleModels);
router.put("/models/:id/category", updateModelCategory);
router.get("/categories", getVehicleCategories);
router.get("/brands", getVehicleBrands);

export default router;