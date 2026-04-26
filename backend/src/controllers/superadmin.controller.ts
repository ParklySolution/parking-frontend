import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { Resend } from "resend";
import jwt from "jsonwebtoken";

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// CREATE TENANT ADMIN
// ============================================================================
export async function createTenantAdminController(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { full_name, email } = req.body;

    console.log("📥 createTenantAdminController:", { tenantId, full_name, email });

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "tenantId è richiesto"
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "email è richiesta"
      });
    }

    if (!full_name) {
      return res.status(400).json({
        success: false,
        error: "full_name è richiesto"
      });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("admin_tenants")
      .select("id, name, company_id")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("❌ Tenant non trovato:", tenantError);
      return res.status(404).json({
        success: false,
        error: "Tenant non trovato"
      });
    }

    console.log("✅ Tenant trovato:", tenant.id, tenant.name);

    const tempPassword = Math.random().toString(36).slice(-12) + "!Aa1";

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: "tenant_admin",
        tenant_id: tenantId
      }
    });

    if (authError) {
      console.error("❌ Errore creazione auth:", authError);
      
      if (authError.message?.includes("already been registered")) {
        return res.status(409).json({
          success: false,
          error: "Email già registrata"
        });
      }
      
      throw authError;
    }

    console.log("✅ Utente auth creato:", authUser.user.id);

    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error: profileError } = await supabase
      .from("admin_profiles")
      .insert({
        auth_user_id: authUser.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: "tenant_admin",
        company_id: tenant.company_id
      });

    if (profileError) {
      console.error("❌ Errore profilo:", profileError);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    console.log("✅ Profilo creato in admin_profiles");

    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://tuo-dominio.com'
      : 'http://localhost:5173';

    const redirectUrl = `${frontendUrl}/auth/update-password`;

    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    let resetLink = `${frontendUrl}/auth/update-password?email=${encodeURIComponent(email)}&from_invite=true`;

    if (!magicLinkError && magicLinkData?.properties?.action_link) {
      resetLink = magicLinkData.properties.action_link;
      console.log("🔗 Magic link generato con successo");
    } else {
      console.warn("⚠️ Magic link non generato, uso fallback:", magicLinkError?.message);
    }

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Parkly <no-reply@park-ly.it>",
      to: [email],
      subject: "Benvenuto in Parkly - Imposta la tua password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a73e8; margin-bottom: 0;">Parkly</h1>
            <p style="color: #666; margin-top: 5px;">Gestione parcheggi professionale</p>
          </div>
          
          <div style="background: #f0f7ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 16px;">Ciao <strong style="color: #1a73e8;">${full_name}</strong>,</p>
            <p style="margin: 10px 0 0;">Sei stato invitato come <strong>Tenant Admin</strong> per il tenant <strong>${tenant.name}</strong>.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #1a73e8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
              Imposta la tua password
            </a>
          </div>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px; font-size: 14px;"><strong>⚡ Credenziali temporanee (se il pulsante non funziona):</strong></p>
            <ul style="margin: 0; font-size: 14px;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Password temporanea:</strong> <code style="background: #e0e0e0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></li>
            </ul>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #333;">
              <strong>🔐 Importante:</strong> Nel tenant admin potrai gestire prezzi, abbonamenti, clienti, veicoli, 
              lavaggi, report e tutte le operazioni del parcheggio. Dopo il primo accesso ti consigliamo di cambiare la password.
            </p>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            Questa email è stata inviata automaticamente da Parkly.<br>
            © Parkly - Gestione parcheggi
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error("❌ Errore invio email Resend:", emailError);
    } else {
      console.log("✅ Email inviata con Resend! ID:", emailData?.id);
    }

    return res.status(201).json({
      success: true,
      message: "Tenant admin creato con successo. Email inviata con le credenziali.",
      data: {
        user_id: authUser.user.id,
        email: email,
        full_name: full_name,
        temporary_password: tempPassword,
        tenant_id: tenantId,
        tenant_name: tenant.name
      }
    });

  } catch (err: any) {
    console.error("❌ ERRORE createTenantAdminController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore interno del server"
    });
  }
}

// ============================================================================
// GET USER PROFILE
// ============================================================================
export async function getUserProfileController(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    console.log("📥 getUserProfileController:", userId);
    
    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("auth_user_id, role, company_id, first_name, last_name, email")
      .eq("auth_user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("❌ Errore get profile:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    console.log("✅ Profilo trovato:", profile);
    
    return res.json({
      success: true,
      profile: profile
    });
    
  } catch (err: any) {
    console.error("❌ ERRORE getUserProfileController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// GET CURRENT USER
// ============================================================================
export async function getCurrentUserController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Non autenticato"
      });
    }
    
    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || profile?.role,
        tenant_id: user.user_metadata?.tenant_id || profile?.company_id
      },
      profile: profile
    });
    
  } catch (err: any) {
    console.error("❌ ERRORE getCurrentUserController:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

// ============================================================================
// IMPERSONATION - VERSIONE PROFESSIONALE
// ============================================================================
// backend/src/controllers/superadmin.controller.ts

export async function impersonateUserController(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    console.log("🕵️ [impersonateUserController] Richiesta per tenantId:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId è richiesto"
      });
    }

    // 1. Trova il tenant e il suo owner_user_id
    const { data: tenant, error: tenantError } = await supabase
      .from("admin_tenants")
      .select("id, name, owner_user_id")
      .eq("id", userId)
      .maybeSingle();

    if (tenantError || !tenant) {
      return res.status(404).json({
        success: false,
        error: "Tenant non trovato"
      });
    }

    if (!tenant.owner_user_id) {
      return res.status(400).json({
        success: false,
        error: "Questo tenant non ha un owner_user_id valido"
      });
    }

    console.log("✅ Tenant trovato:", tenant.name);
    console.log("✅ owner_user_id:", tenant.owner_user_id);

    // 2. Ottieni i dati dell'utente da impersonare
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(tenant.owner_user_id);

    if (userError || !userData.user) {
      return res.status(404).json({
        success: false,
        error: "Utente da impersonare non trovato"
      });
    }

    console.log("✅ Utente da impersonare:", userData.user.email);

    // 3. Genera un magic link per l'utente
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://tuo-dominio.com'
      : 'http://localhost:5173';

    const { data: magicLink, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
      options: {
        redirectTo: `${frontendUrl}/auth/impersonate-callback?tenant_id=${tenant.id}`
      }
    });

    if (magicError) {
      console.error("❌ Errore generazione magic link:", magicError);
      return res.status(500).json({
        success: false,
        error: magicError.message
      });
    }

    const magicLinkUrl = magicLink.properties?.action_link;
    
    if (!magicLinkUrl) {
      return res.status(500).json({
        success: false,
        error: "Impossibile generare il magic link"
      });
    }

    console.log("✅ Magic link generato:", magicLinkUrl);

    return res.status(200).json({
      success: true,
      magic_link: magicLinkUrl,
      tenant_id: tenant.id,
      user_email: userData.user.email
    });

  } catch (err: any) {
    console.error("❌ ERRORE impersonateUserController:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Errore interno del server"
    });
  }
}