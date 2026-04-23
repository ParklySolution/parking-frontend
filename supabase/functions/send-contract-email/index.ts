import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  return new Response(JSON.stringify({ messaggio: "FUNZIONA DAVVERO" }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  })
})