import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { decodeJwt } from "https://esm.sh/jose@4.14.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenant_id, full_name, email } = await req.json();

    if (!tenant_id || !full_name || !email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1️⃣ Verifica autenticazione del chiamante
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // 2️⃣ Decodifica JWT manuale (necessario in Functions v2)
    let user;
    try {
      user = decodeJwt(token);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 3️⃣ Controlla che sia super_admin
    if (user.user_metadata?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // 4️⃣ Chiama la funzione interna usando il SERVICE ROLE
    const internalClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data, error } = await internalClient.functions.invoke(
      "create-tenant-admin",
      {
        body: { tenant_id, full_name, email },
      }
    );

    if (error) {
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
