import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendInviteEmail(email: string, full_name: string, token: string) {
  const inviteUrl = `${SITE_URL}/accept-invite?token=${token}`;

  const htmlTemplate = `
  <!DOCTYPE html>
  <html lang="it">
    <body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa; padding:40px 0;">
        <tr>
          <td align="center">

            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

              <tr>
                <td style="background:#1a1f25; padding:30px 20px; text-align:center;">
                  <img src="${SITE_URL}/parkly-logo.png"
                       alt="Park-Ly Logo"
                       style="display:block; margin:0 auto 10px; max-width:180px;">
                  <h1 style="color:#ffffff; font-size:22px; margin:0; font-weight:600;">
                    Invito come Operatore
                  </h1>
                </td>
              </tr>

              <tr>
                <td style="padding:30px 40px; color:#333333; font-size:15px; line-height:1.6;">
                  <p style="margin-top:0;">Ciao <strong>${full_name}</strong>,</p>

                  <p>
                    Sei stato invitato come <strong>Operatore</strong> del tuo tenant su <strong>Park-Ly</strong>.
                    Per completare la configurazione del tuo account e accedere alla dashboard,
                    clicca sul pulsante qui sotto.
                  </p>

                  <div style="text-align:center; margin:30px 0;">
                    <a href="${inviteUrl}"
                       style="
                         background:#4f8cff;
                         color:#ffffff;
                         padding:14px 28px;
                         border-radius:8px;
                         text-decoration:none;
                         font-size:16px;
                         font-weight:600;
                         display:inline-block;
                       ">
                      Accetta Invito
                    </a>
                  </div>

                  <p>
                    Se il pulsante non dovesse funzionare, copia e incolla questo link nel tuo browser:
                  </p>

                  <p style="word-break:break-all; color:#4f8cff;">
                    ${inviteUrl}
                  </p>

                  <p>
                    Se non ti aspettavi questa email, puoi ignorarla in sicurezza.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#f0f2f5; padding:20px 30px; text-align:center; color:#777777; font-size:12px;">
                  <p style="margin:0;">
                    © 2026 Park-Ly — Tutti i diritti riservati<br>
                    Via Belgio 2/3, Palermo (PA)
                  </p>
                  <p style="margin:8px 0 0; font-size:11px; color:#999999;">
                    Questo è un messaggio automatico. Non rispondere a questa email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@park-ly.it",
      to: [email],
      subject: "Invito come Operatore",
      html: htmlTemplate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const { email, full_name, tenant_id } = body;

    if (!email || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    const token = crypto.randomUUID();
    let userId = null;

    if (existingUser) {
      userId = existingUser.id;

      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          full_name,
          role: "operator",
          tenant_id,
          invite_token: token,
        },
      });
    } else {
      const { data } = await supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          full_name,
          role: "operator",
          tenant_id,
          invite_token: token,
        },
      });

      userId = data?.user?.id;
    }

    await sendInviteEmail(email, full_name, token);

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
