import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  approvalRequired: boolean;
  accessStatus: "pending" | "approved" | "declined" | null;
  accessRequestedAt: string | null;
  accessLoading: boolean;
  accessError: string | null;
  refreshAccess: () => Promise<void>;
};

type MemberAccessSnapshot = Pick<
  AuthState,
  "approvalRequired" | "accessStatus" | "accessRequestedAt" | "accessError"
>;

async function loadMemberAccess(userId: string): Promise<MemberAccessSnapshot> {
  const [settingsResult, accessResult] = await Promise.all([
    supabase.from("site_access_settings").select("approval_required").eq("id", true).maybeSingle(),
    supabase.from("member_access").select("status, requested_at").eq("user_id", userId).maybeSingle(),
  ]);

  if (settingsResult.error || accessResult.error) {
    console.error("Could not verify Neighborly access", settingsResult.error || accessResult.error);
    return {
      approvalRequired: true,
      accessStatus: null,
      accessRequestedAt: null,
      accessError: "We could not verify your access status. Please try again.",
    };
  }

  return {
    approvalRequired: settingsResult.data?.approval_required !== false,
    accessStatus: (accessResult.data?.status as MemberAccessSnapshot["accessStatus"]) || null,
    accessRequestedAt: accessResult.data?.requested_at || null,
    accessError: null,
  };
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
    approvalRequired: true,
    accessStatus: null,
    accessRequestedAt: null,
    accessLoading: true,
    accessError: null,
    refreshAccess: async () => undefined,
  });

  const refreshAccess = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;
    setState((current) => ({ ...current, accessLoading: true, accessError: null }));
    const access = await loadMemberAccess(userData.user.id);
    setState((current) => ({ ...current, ...access, accessLoading: false }));
  }, []);

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
          approvalRequired: true,
          accessStatus: null,
          accessRequestedAt: null,
          accessLoading: false,
          accessError: null,
          refreshAccess,
        });
        return;
      }

      // getUser validates the access token with Supabase before protected UI renders.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      const access = userError || !userData.user
        ? { approvalRequired: true, accessStatus: null, accessRequestedAt: null, accessError: userError?.message || "We could not verify your account." }
        : await loadMemberAccess(userData.user.id);
      if (!active) return;

      setState({
        session: userError ? null : sessionData.session,
        user: userError ? null : userData.user,
        loading: false,
        error: userError?.message ?? null,
        ...access,
        accessLoading: false,
        refreshAccess,
      });
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setState({
          session: null,
          user: null,
          loading: false,
          error: null,
          approvalRequired: true,
          accessStatus: null,
          accessRequestedAt: null,
          accessLoading: false,
          accessError: null,
          refreshAccess,
        });
        return;
      }

      setState((current) => ({
        ...current,
        session,
        user: session.user,
        loading: false,
        error: null,
        accessLoading: true,
        accessError: null,
        refreshAccess,
      }));
      void loadMemberAccess(session.user.id).then((access) => {
        if (!active) return;
        setState((current) => ({ ...current, ...access, accessLoading: false, refreshAccess }));
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshAccess]);

  return <AuthContext.Provider value={{ ...state, refreshAccess }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
