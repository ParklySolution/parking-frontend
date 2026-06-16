import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Carica variabili d'ambiente ALL'INIZIO
dotenv.config();

// Import routes
import superadminRoutes from "./routes/superadmin.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import authRoutes from "./routes/auth.routes.js"; // 🔥 NUOVA ROUTE PER AUTH
import vehicleRoutes from "./routes/vehicle.routes";
import emailRoutes from "./routes/emailRoutes.js"; // 🔥 ROTTA EMAIL

// Import cron job per processare email
import "./jobs/emailProcessor.js"; // 🔥 CRON JOB

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check (UTILE PER TEST)
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

// Routes - NOTA: aggiunto /api/ prefix
app.use("/api/superadmin", superadminRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/auth", authRoutes); // 🔥 NUOVA ROUTE PER AUTH (forgot/reset password)
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/email", emailRoutes); // 🔥 ROTTA EMAIL (process-emails)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler globale
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("❌ ERRORE GLOBALE:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Errore interno del server"
  });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`🚀 Backend avviato su http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Routes: /api/superadmin/tenants/:tenantId/create-tenant-admin`);
  console.log(`🔗 Tenant routes: /api/tenant/:tenantId/brands`);
  console.log(`🔗 Auth routes: /api/auth/forgot-password, /api/auth/reset-password`);
  console.log(`📧 Email routes: /api/email/process-emails`);
  console.log(`⏰ Cron job email processor avviato (controlla ogni minuto)`);
});