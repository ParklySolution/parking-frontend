// src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";

// 🔍 LOG DIAGNOSTICO: deve essere la PRIMA istruzione utile
console.log("🔍 CARICAMENTO SUPABASE.TS");

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: "supabase.auth.token",
  },
});

// 🔐 AUTOLOGIN DEV (solo se NON impersonato)
const impersonationToken = localStorage.getItem("impersonation_token");

export async function ensureDevLogin() {
  if (impersonationToken) return;

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    await supabase.auth.signInWithPassword({
      email: "dev@parking.local",
      password: "devpassword",
    });
  }
}
