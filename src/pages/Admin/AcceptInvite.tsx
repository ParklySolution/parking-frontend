import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const colors = {
    primary: "#3B82F6",
    bgDark: "#0f172a",
    bgCard: "#1e293b",
    border: "#334155",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    errorBg: "rgba(239, 68, 68, 0.1)",
    errorBorder: "rgba(239, 68, 68, 0.3)",
    errorText: "#f87171",
    successBg: "rgba(16, 185, 129, 0.1)",
    successBorder: "rgba(16, 185, 129, 0.3)",
    successText: "#34d399",
  };

  useEffect(() => {
    if (!token) {
      setError("Link non valido. Richiedi un nuovo invito.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    
    if (password.length < 6) {
      setError("La password deve essere almeno 6 caratteri");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'accettazione dell'invito");
      }

      setSuccess(true);
      
      setTimeout(() => {
        navigate("/admin/login");
      }, 3000);
      
    } catch (err: any) {
      console.error("❌ ERRORE:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e1b4b 100%)`,
        padding: "16px",
      }}>
        <div style={{
          maxWidth: "440px",
          width: "100%",
          background: colors.bgCard,
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
          <h2 style={{ color: colors.textPrimary, marginBottom: "8px" }}>Link non valido</h2>
          <p style={{ color: colors.textSecondary, marginBottom: "24px" }}>
            Il link che hai usato non è valido o è scaduto.
          </p>
          <Link to="/admin/login" style={{
            background: colors.primary,
            color: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            textDecoration: "none",
            display: "inline-block",
          }}>
            Torna al login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e1b4b 100%)`,
        padding: "16px",
      }}>
        <div style={{
          maxWidth: "440px",
          width: "100%",
          background: colors.bgCard,
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ color: colors.successText, marginBottom: "8px" }}>Password impostata!</h2>
          <p style={{ color: colors.textSecondary, marginBottom: "24px" }}>
            Ora puoi accedere con la tua nuova password.
          </p>
          <Link to="/admin/login" style={{
            background: colors.primary,
            color: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            textDecoration: "none",
            display: "inline-block",
          }}>
            Vai al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e1b4b 100%)`,
      padding: "16px",
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        background: colors.bgCard,
        borderRadius: "24px",
        padding: "40px 32px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: `1px solid ${colors.border}`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: `linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%)`,
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: colors.textPrimary, marginBottom: "8px" }}>
            Accetta Invito
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: "14px" }}>
            Imposta la tua password per completare la registrazione
          </p>
        </div>

        {error && (
          <div style={{
            marginBottom: "24px",
            padding: "12px 16px",
            background: colors.errorBg,
            border: `1px solid ${colors.errorBorder}`,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.errorText} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: colors.errorText, fontSize: "14px" }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: colors.textSecondary,
              marginBottom: "8px",
            }}>
              Nuova password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
              Minimo 6 caratteri
            </small>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: colors.textSecondary,
              marginBottom: "8px",
            }}>
              Conferma password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.textSecondary,
                }}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
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
            }}
          >
            {loading ? "Elaborazione..." : "Imposta password e accedi"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link
            to="/admin/login"
            style={{
              fontSize: "14px",
              color: colors.textSecondary,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
          >
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}