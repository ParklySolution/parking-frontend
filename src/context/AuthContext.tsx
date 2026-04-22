import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/services/supabase";

const AuthContext = createContext({
  user: null,
  isReady: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Carica la sessione iniziale
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsReady(true);
    });

    // 2. Ascolta i cambiamenti
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsReady(true);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
