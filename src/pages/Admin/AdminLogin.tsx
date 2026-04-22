import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/services/supabase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("📦 Tentativo login con:", { email });

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        console.error("❌ Errore login:", loginError);
        setError(loginError.message);
        return;
      }

      console.log("✅ Login riuscito!", data);

      // 🔍 Recupero profilo
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      console.log("📊 PROFILO TROVATO:", profileData);

      // Se non esiste → lo creo
      if (!profileData) {
        const role = data.user.user_metadata?.role || "operator";
        const tenantId = data.user.user_metadata?.tenant_id || null;
        const fullName = data.user.user_metadata?.full_name || null;

        await supabase.from("profiles").insert({
          id: data.user.id,
          role,
          tenant_id: tenantId,
          full_name: fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        await redirectBasedOnRole(role, tenantId, data.user.id);
        return;
      }

      // Profilo esistente → redirect
      await redirectBasedOnRole(profileData.role, profileData.tenant_id, data.user.id);

    } catch (err: any) {
      console.error("❌ Errore login:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     🔀 REDIRECT MULTI-RUOLO (VERSIONE CORRETTA)
  ============================================================ */
  const redirectBasedOnRole = async (
    role: string | null,
    tenantId: string | null,
    userId: string | null
  ) => {
    console.log("🚀 Redirect con:", { role, tenantId, userId });

    switch (role) {
      case "super_admin":
        navigate("/super");
        return;

      case "company_owner":
        if (!tenantId) {
          setError("Tenant ID mancante per company_owner");
          return;
        }
        navigate(`/tenant/${tenantId}/dashboard`);
        return;

      case "tenant_admin":
        if (!tenantId) {
          setError("Tenant ID mancante per tenant_admin");
          return;
        }
        navigate(`/tenant/${tenantId}/dashboard`);
        return;

      case "admin":
      case "manager":
        if (!tenantId) {
          setError("Tenant ID mancante per manager");
          return;
        }
        navigate(`/admin/${tenantId}`);
        return;

      case "operator":
        if (!tenantId) {
          setError("Tenant ID mancante per operator");
          return;
        }
        navigate("/dashboard");
        return;

      default:
        console.warn("⚠️ Ruolo non riconosciuto:", role);
        navigate("/");
    }
  };

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: "40px",
        borderRadius: "16px",
        background: "#ffffff",
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginBottom: 10, fontSize: 28, fontWeight: 700 }}>
        🔐 Login Admin
      </h2>

      <p style={{ color: "#555", marginBottom: 30 }}>
        Accedi al pannello di amministrazione
      </p>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "18px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "18px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            background: loading ? "#9ca3af" : "#2563eb",
            color: "white",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 600,
            transition: "0.2s",
          }}
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>

      <div style={{ marginTop: 20 }}>
        <Link
          to="/auth/forgot"
          style={{
            color: "#2563eb",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Hai dimenticato la password?
        </Link>
      </div>
    </div>
  );
}
