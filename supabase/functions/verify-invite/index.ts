import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

Deno.serve(async (req) => {
  // ⭐ CORS preflight (FONDAMENTALE!)
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
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token e password richiesti" }),
        { 
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // 1. Cerca l'utente con questo token nei metadata
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error("❌ Errore ricerca utenti:", searchError);
      return new Response(
        JSON.stringify({ error: "Errore durante la ricerca dell'utente" }),
        { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    // Cerca l'utente che ha il token nei metadata
    const user = users.users.find(u => 
      u.user_metadata?.invite_token === token
    );

    if (!user) {
      console.log("❌ Token non trovato:", token);
      return new Response(
        JSON.stringify({ error: "Token non valido o scaduto" }),
        { 
          status: 404,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    console.log("✅ Utente trovato:", user.email);

    // 2. Aggiorna la password e conferma l'utente
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          invite_token: null, // Rimuovi il token dopo l'uso
          invite_accepted_at: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.error("❌ Errore aggiornamento utente:", updateError);
      return new Response(
        JSON.stringify({ error: "Errore durante l'aggiornamento della password" }),
        { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    console.log("✅ Utente aggiornato con successo");

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("❌ Errore generale:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    );
  }
});