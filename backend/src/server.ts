import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Carica variabili d'ambiente ALL'INIZIO
dotenv.config();

// Import routes
import superadminRoutes from "./routes/superadmin.routes.js";

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
});