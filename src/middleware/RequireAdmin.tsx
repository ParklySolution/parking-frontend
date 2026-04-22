import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/services/supabase";

export default function RequireAdmin({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        setRole(profile?.role ?? null);
      }

      setLoading(false);
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "20px",
          color: "#3B82F6",
        }}
      >
        Verifica credenziali...
      </div>
    );
  }

  // ❌ Se NON loggato → redirect al login admin
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  // ❌ Se NON è admin → redirect alla dashboard operatore
  if (role !== "admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // ✔ Se è admin → accede
  return children;
}
