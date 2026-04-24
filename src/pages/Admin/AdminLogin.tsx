// frontend/src/pages/Admin/AdminLogin.tsx
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
        } else if (tenantId && (role === "tenant_admin" || role === "operator")) {
          navigate(`/tenant/${tenantId}/dashboard`, { replace: true });
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

      // 1. 🔐 Login con Supabase Auth
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

      // 2. 🔥 CHIAMA IL BACKEND usando api.service
      const { profile } = await api.getProfile(data.user.id);
      console.log("📊 Profilo dal backend:", profile);

      // 3. Determina ruolo e tenantId (priorità: admin_profiles > metadata)
      const role = profile?.role || data.user.user_metadata?.role || data.user.app_metadata?.role;
      const tenantId = profile?.company_id || data.user.user_metadata?.tenant_id;

      console.log("📊 Ruolo determinato:", role);
      console.log("📊 Tenant ID:", tenantId);

      // 4. 🔀 Redirect basato sul ruolo
      if (role === "super_admin") {
        navigate("/super/dashboard", { replace: true });
        return;
      }

      if (role === "tenant_admin" || role === "operator") {
        if (!tenantId) {
          setError("Profilo utente incompleto: tenant_id mancante");
          return;
        }
        navigate(`/tenant/${tenantId}/dashboard`, { replace: true });
        return;
      }

      if (role === "admin" || role === "manager") {
        if (!tenantId) {
          setError("Profilo utente incompleto: tenant_id mancante");
          return;
        }
        navigate(`/admin/${tenantId}`, { replace: true });
        return;
      }

      // Fallback: ruolo non riconosciuto
      console.warn("⚠️ Ruolo non riconosciuto:", role);
      navigate("/dashboard");

    } catch (err: any) {
      console.error("❌ Errore login:", err);
      setError("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Parkly</h1>
          <p className="text-gray-500 mt-1">Accedi al pannello di amministrazione</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@azienda.it"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Accesso in corso...
              </>
            ) : (
              "Accedi"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/auth/forgot"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Password dimenticata?
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © 2024 Parkly - Gestione parcheggi
        </p>
      </div>
    </div>
  );
}