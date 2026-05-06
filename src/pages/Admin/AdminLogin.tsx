import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { api } from "@/services/api.service";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Verifica se l'utente è già loggato
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = session.user.user_metadata?.role || session.user.app_metadata?.role;
        const tenantId = session.user.user_metadata?.tenant_id;
        
        if (role === "super_admin") {
          navigate("/super/dashboard", { replace: true });
        } else if (role === "tenant_admin" && tenantId) {
          navigate(`/tenant/${tenantId}/dashboard`, { replace: true });
        } else if (role === "operator") {
          navigate("/dashboard", { replace: true });
        }
      }
    };
    checkSession();
  }, [navigate]);

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
        
        if (loginError.message === "Invalid login credentials") {
          setError("Email o password non validi");
        } else if (loginError.message.includes("Email not confirmed")) {
          setError("Email non confermata. Controlla la tua casella di posta.");
        } else {
          setError(loginError.message);
        }
        return;
      }

      console.log("✅ Login riuscito!");

      const { profile } = await api.getProfile(data.user.id);
      console.log("📊 Profilo dal backend:", profile);

      let role = profile?.role || data.user.user_metadata?.role || data.user.app_metadata?.role;
      let tenantId = profile?.company_id || data.user.user_metadata?.tenant_id;

      console.log("📊 Ruolo determinato:", role);
      console.log("📊 Tenant ID iniziale:", tenantId);

      // 🔥 CORREZIONE: Trova il tenant SPECIFICO associato all'utente
      let finalTenantId = tenantId;

      if (tenantId && (role === "tenant_admin" || role === "operator")) {
        console.log("🔍 Cerco tenant per company_id:", tenantId);
        
        // Recupera l'user metadata per avere il tenant_id specifico
        const userMetadata = data.user.user_metadata;
        const specificTenantId = userMetadata?.tenant_id;
        
        console.log("📊 Tenant specifico dall'user metadata:", specificTenantId);
        
        if (specificTenantId) {
          // Verifica che il tenant esista
          const { data: specificTenant } = await supabase
            .from("admin_tenants")
            .select("id, name")
            .eq("id", specificTenantId)
            .maybeSingle();
          
          if (specificTenant) {
            finalTenantId = specificTenant.id;
            console.log("✅ Tenant specifico trovato:", finalTenantId, specificTenant.name);
          } else {
            // Fallback: cerca per company_id
            const { data: tenants } = await supabase
              .from("admin_tenants")
              .select("id, name")
              .eq("company_id", tenantId);
            
            if (tenants && tenants.length > 0) {
              finalTenantId = tenants[0].id;
              console.log("⚠️ Fallback al primo tenant:", finalTenantId);
            }
          }
        } else {
          // Se non c'è tenant specifico, cerca per company_id
          const { data: tenants } = await supabase
            .from("admin_tenants")
            .select("id, name")
            .eq("company_id", tenantId);
          
          if (tenants && tenants.length > 0) {
            finalTenantId = tenants[0].id;
            console.log("⚠️ Nessun tenant specifico, uso il primo:", finalTenantId);
          }
        }
      }

      console.log("📊 Tenant ID finale:", finalTenantId);

      // 🔥 REDIRECT CORRETTO PER RUOLO
      if (role === "super_admin") {
        navigate("/super/dashboard", { replace: true });
        return;
      }

      if (role === "tenant_admin") {
        if (!finalTenantId) {
          setError("Profilo utente incompleto: tenant_id mancante");
          return;
        }
        navigate(`/tenant/${finalTenantId}/dashboard`, { replace: true });
        return;
      }

      if (role === "operator") {
        // 🔥 OPERATOR → va alla dashboard generica (non tenant)
        navigate("/dashboard", { replace: true });
        return;
      }

      if (role === "admin" || role === "manager") {
        if (!finalTenantId) {
          setError("Profilo utente incompleto: tenant_id mancante");
          return;
        }
        navigate(`/admin/${finalTenantId}`, { replace: true });
        return;
      }

      console.warn("⚠️ Ruolo non riconosciuto:", role);
      navigate("/dashboard");

    } catch (err: any) {
      console.error("❌ Errore login:", err);
      setError("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  }

  // STILI (invariati)
  const colors = {
    primary: "#3B82F6",
    primaryDark: "#2563EB",
    bgDark: "#0f172a",
    bgCard: "#1e293b",
    border: "#334155",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    errorBg: "rgba(239, 68, 68, 0.1)",
    errorBorder: "rgba(239, 68, 68, 0.3)",
    errorText: "#f87171",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e1b4b 100%)`,
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          background: colors.bgCard,
          borderRadius: "24px",
          padding: "40px 32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: `linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%)`,
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: colors.textPrimary, marginBottom: "8px" }}>
            Parkly
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: "14px" }}>
            Gestione parcheggi professionale
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              marginBottom: "24px",
              padding: "12px 16px",
              background: colors.errorBg,
              border: `1px solid ${colors.errorBorder}`,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.errorText} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: colors.errorText, fontSize: "14px" }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: colors.textSecondary,
                marginBottom: "8px",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@azienda.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0f172a",
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
                color: colors.textPrimary,
                fontSize: "15px",
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(59, 130, 246, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: colors.textSecondary,
                marginBottom: "8px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 48px 12px 16px",
                  background: "#0f172a",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                  color: colors.textPrimary,
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(59, 130, 246, 0.1)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.textSecondary,
                  padding: "4px",
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: `linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%)`,
              border: "none",
              borderRadius: "12px",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = "1";
              }
            }}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                </svg>
                Accesso in corso...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Accedi
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link
            to="/auth/forgot"
            style={{
              fontSize: "14px",
              color: colors.textSecondary,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textSecondary;
            }}
          >
            Password dimenticata?
          </Link>
        </div>

        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: `1px solid ${colors.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "12px", color: colors.textSecondary }}>
            © 2024 Parkly - Gestione parcheggi professionali
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}