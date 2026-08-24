import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError || !sessionData.session) {
        setState({
          session: null,
          user: null,
          loading: false,
          error: sessionError?.message ?? null,
        });
        return;
      }

      // getUser validates the access token with Supabase before protected UI renders.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      setState({
        session: userError ? null : sessionData.session,
        user: userError ? null : userData.user,
        loading: false,
        error: userError?.message ?? null,
      });
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        error: null,
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
