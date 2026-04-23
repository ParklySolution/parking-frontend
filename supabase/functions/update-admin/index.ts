import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // ⭐ CORS preflight
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

  // 🔐 Leggi token utente
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  // 🔐 Client utente (per validare ruolo)
  const supabaseUser = createClient(
    Deno.env.get("PROJECT_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  // 🔍 Recupera utente
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // 🔍 Controlla ruolo super_admin
  if (user.app_metadata.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // 🔑 Client service role (per aggiornare utenti)
  const supabaseAdmin = createClient(
    Deno.env.get("PROJECT_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!
  );

  try {
    const { user_id, email, full_name } = await req.json();

    // 1️⃣ Aggiorna utente Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        email,
        user_metadata: {
          full_name,
          role: "admin",
        },
      }
    );

    if (authError) throw authError;

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
