import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token non fornito" });
    }
    
    const token = authHeader.split(" ")[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: "Token non valido" });
    }
    
    (req as any).user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Errore autenticazione" });
  }
}