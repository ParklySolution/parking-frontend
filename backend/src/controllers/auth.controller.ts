import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// POST /api/auth/forgot-password
export async function forgotPasswordController(req: Request, res: Response) {
  try {
    const { email } = req.body;
    console.log("📧 [forgotPassword] Richiesta per:", email);

    if (!email) {
      return res.status(400).json({ error: "Email richiesta" });
    }

    let userId = null;
    let userEmail = email;

    // METODO 1: Cerca in auth.users
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users) {
        const foundUser = users.find(u => u.email === email);
        if (foundUser) {
          userId = foundUser.id;
          userEmail = foundUser.email;
          console.log("✅ Utente trovato in auth.users:", userId);
        }
      }
    } catch (err) {
      console.warn("⚠️ Errore ricerca in auth.users:", err);
    }

    // METODO 2: Cerca in admin_profiles
    if (!userId) {
      const { data: profiles, error: profileError } = await supabase
        .from("admin_profiles")
        .select("auth_user_id, email")
        .eq("email", email);

      if (!profileError && profiles && profiles.length > 0) {
        userId = profiles[0].auth_user_id;
        userEmail = profiles[0].email;
        console.log("✅ Utente trovato in admin_profiles:", userId);
        
        if (profiles.length > 1) {
          console.warn("⚠️ Attenzione: trovati", profiles.length, "profili duplicati per", email);
        }
      }
    }

    if (!userId) {
      console.log("⚠️ Utente non trovato:", email);
      return res.json({ 
        success: true, 
        message: "Se l'email esiste, riceverai un link per reimpostare la password." 
      });
    }

    // Genera token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Salva token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: userId,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("❌ Errore salvataggio token:", insertError);
      return res.status(500).json({ error: "Errore interno" });
    }

    const resetLink = `${FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    // Invia email
    const { error: emailError } = await resend.emails.send({
      from: "Parkly <no-reply@park-ly.it>",
      to: [userEmail],
      subject: "Reimposta la tua password - Parkly",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6;">Parkly</h1>
          </div>
          
          <div style="background: #f0f7ff; padding: 20px; border-radius: 10px;">
            <p>Ciao,</p>
            <p>Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Parkly.</p>
            <p style="text-align: center; margin: 25px 0;">
              <a href="${resetLink}" 
                 style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                Reimposta password
              </a>
            </p>
            <p>Questo link è valido per 1 ora.</p>
            <p style="color: #666; font-size: 12px;">Se non hai richiesto tu questa modifica, ignora questa email.</p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("❌ Errore invio email:", emailError);
      return res.status(500).json({ error: "Errore invio email: " + emailError.message });
    }

    console.log("✅ Email reset inviata a:", userEmail);
    return res.json({ success: true, message: "Email inviata" });

  } catch (err: any) {
    console.error("❌ [forgotPassword] Errore:", err);
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/auth/reset-password
export async function resetPasswordController(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    console.log("🔐 [resetPassword] Tentativo reset");

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token e nuova password richiesti" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La password deve essere di almeno 8 caratteri" });
    }

    // 1. Verifica il token
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("user_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("❌ Token non valido:", tokenError);
      return res.status(400).json({ error: "Link non valido" });
    }

    // 2. Verifica se è scaduto
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("⚠️ Token scaduto:", tokenData.expires_at);
      return res.status(400).json({ error: "Link scaduto. Richiedine uno nuovo." });
    }

    // 3. Verifica se è già stato usato
    if (tokenData.used_at) {
      console.log("⚠️ Token già usato");
      return res.status(400).json({ error: "Link già utilizzato" });
    }

    // 4. Aggiorna la password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("❌ Errore aggiornamento password:", updateError);
      return res.status(500).json({ error: "Errore aggiornamento password" });
    }

    // 5. Marca il token come usato
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    console.log("✅ Password aggiornata con successo per user:", tokenData.user_id);

    return res.json({ success: true, message: "Password aggiornata con successo" });

  } catch (err: any) {
    console.error("❌ [resetPassword] Errore:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================================
// ACCEPT INVITE - COMPLETA LA REGISTRAZIONE DELL'OPERATORE
// ============================================================================

// POST /api/auth/accept-invite
export async function acceptInviteController(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    console.log("📧 [acceptInvite] Richiesta ricevuta con token:", token);

    if (!token || !password) {
      return res.status(400).json({ error: "Token e password richiesti" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La password deve essere almeno 6 caratteri" });
    }

    // 1. Verifica il token nella tabella degli inviti
    const { data: invite, error: inviteError } = await supabase
      .from("user_invites")
      .select("id, email, user_id, tenant_id, role, expires_at, used_at")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      console.error("❌ Token non valido:", inviteError);
      return res.status(400).json({ error: "Link non valido" });
    }

    // 2. Verifica se è scaduto
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: "Link scaduto. Richiedi un nuovo invito." });
    }

    // 3. Verifica se è già stato usato
    if (invite.used_at) {
      return res.status(400).json({ error: "Link già utilizzato" });
    }

    // 4. Aggiorna la password dell'utente esistente
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      invite.user_id,
      { password }
    );

    if (updateError) {
      console.error("❌ Errore aggiornamento password:", updateError);
      return res.status(500).json({ error: "Errore aggiornamento password" });
    }

    // 5. Marca il token come usato
    await supabase
      .from("user_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    console.log("✅ Password impostata per utente:", invite.user_id);

    return res.json({ 
      success: true, 
      message: "Password impostata con successo",
      redirectTo: invite.role === "operator" ? `/tenant/${invite.tenant_id}/dashboard` : `/admin/${invite.tenant_id}`
    });

  } catch (err: any) {
    console.error("❌ [acceptInvite] Errore:", err);
    return res.status(500).json({ error: err.message });
  }
}