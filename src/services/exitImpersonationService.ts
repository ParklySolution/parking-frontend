export async function exitImpersonation() {
  // 1️⃣ Recupera sessione admin salvata
  const saved = localStorage.getItem("admin_session");
  if (!saved) {
    console.error("Nessuna sessione admin salvata");
    return false;
  }

  const adminSession = JSON.parse(saved);

  // 2️⃣ Ripristina la sessione admin
  const { error } = await window.supabase.auth.setSession(adminSession);

  if (error) {
    console.error("Errore ripristino sessione admin:", error);
    return false;
  }

  // 3️⃣ Pulisci localStorage
  localStorage.removeItem("admin_session");

  return true;
}
