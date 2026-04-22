import { Request, Response, NextFunction } from "express";

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "Utente non autenticato" });
    }
    
    const role = user.user_metadata?.role || user.app_metadata?.role;
    
    if (role !== "super_admin") {
      return res.status(403).json({ error: "Accesso negato: richiesto ruolo super_admin" });
    }
    
    next();
  } catch (err) {
    console.error("Role error:", err);
    return res.status(500).json({ error: "Errore verifica ruolo" });
  }
}