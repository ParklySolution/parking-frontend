// supabase/functions/generate-impersonation-token/index.ts
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  console.log("🚀 [START] generate-impersonation-token");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id_to_impersonate } = await req.json();

    if (!user_id_to_impersonate) {
      throw new Error("Missing user_id_to_impersonate");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing");
    if (!SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1️⃣ Recupera l’utente da impersonare
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(user_id_to_impersonate);

    if (userError) throw userError;
    if (!userData.user) throw new Error("User not found");

    // 2️⃣ Genera una sessione impersonata
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.createSession({
        user_id: user_id_to_impersonate,
      });

    if (sessionError) throw sessionError;

    return new Response(JSON.stringify(sessionData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("🔥 [ERROR] generate-impersonation-token:", err);

    return new Response(
      JSON.stringify({
        error: err?.message ?? "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
