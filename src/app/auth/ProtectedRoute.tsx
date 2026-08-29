import { type ReactNode, useEffect, useState } from "react";
import { Clock3, LogOut, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/app/auth/AuthProvider";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";
import { supabase } from "@/lib/supabase";

type RestrictionState = "active" | "warned" | "suspended" | "banned";
type Restriction = {
  state: RestrictionState;
  public_reason: string | null;
  suspended_until: string | null;
};

function AccessRequestScreen({
  status,
  requestedAt,
  error,
  refreshAccess,
}: {
  status: "pending" | "declined" | null;
  requestedAt: string | null;
  error: string | null;
  refreshAccess: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const declined = status === "declined";

  useEffect(() => {
    if (declined) return;
    const timer = window.setInterval(() => { void refreshAccess(); }, 30000);
    return () => window.clearInterval(timer);
  }, [declined, refreshAccess]);

  async function checkAgain() {
    setRefreshing(true);
    await refreshAccess();
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-purple-950 px-4 py-10 font-['DM_Sans',sans-serif] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
        <ImageWithFallback src={neighborlyLogo} alt="Neighborly App" className="mx-auto mb-5 h-auto w-36 object-contain" />
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${declined ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          {declined ? <XCircle size={28} /> : <Clock3 size={28} />}
        </div>
        <h1 className="font-['Playfair_Display',serif] text-2xl font-bold text-foreground">
          {declined ? "Access request not approved" : "Your request is awaiting approval"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {declined
            ? "Neighborly is currently limited to invited testers. Your request was not approved at this time."
            : "Neighborly is currently invite-only while testing. An administrator will review your request before you can enter the community."}
        </p>
        {requestedAt && !declined ? <p className="mt-2 text-xs text-muted-foreground">Requested {new Date(requestedAt).toLocaleDateString()}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-col gap-2">
          {!declined ? (
            <button onClick={() => { void checkAgain(); }} disabled={refreshing} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Checking…" : "Check approval status"}
            </button>
          ) : null}
          <button onClick={() => { void supabase.auth.signOut(); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
            <LogOut size={16} /> Sign out
          </button>
        </div>
        <div className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-left text-xs text-muted-foreground">
          <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-emerald-600" />
          <span>{declined ? "Your account remains secure, but it cannot enter the community while testing access is restricted." : "Your account is secure. You will automatically gain access after an administrator approves your request."}</span>
        </div>
      </div>
    </div>
  );
}

function AccountRestrictionScreen({ restriction }: { restriction: Restriction }) {
  const suspended = restriction.state === "suspended";
  return (
    <div className="min-h-screen bg-purple-950 px-4 py-10 font-['DM_Sans',sans-serif] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
        <ImageWithFallback src={neighborlyLogo} alt="Neighborly App" className="mx-auto mb-5 h-auto w-36 object-contain" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert size={28} />
        </div>
        <h1 className="font-['Playfair_Display',serif] text-2xl font-bold text-foreground">
          {suspended ? "Your Neighborly account is temporarily suspended" : "Your Neighborly account is restricted"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {restriction.public_reason || (suspended
            ? "Your account has been temporarily suspended while a community safety concern is reviewed."
            : "Your account cannot currently enter Neighborly because of a community safety decision.")}
        </p>
        {suspended && restriction.suspended_until ? (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Scheduled to end <strong>{new Date(restriction.suspended_until).toLocaleString()}</strong>.
          </div>
        ) : null}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          If you believe this was a mistake, contact Neighborly administration and include the name and email on your account.
        </p>
        <button onClick={() => { void supabase.auth.signOut(); }} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const {
    user,
    loading,
    approvalRequired,
    accessStatus,
    accessRequestedAt,
    accessLoading,
    accessError,
    refreshAccess,
  } = useAuth();
  const location = useLocation();
  const [restriction, setRestriction] = useState<Restriction | null>(null);
  const [restrictionLoading, setRestrictionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRestriction(null);
      setRestrictionLoading(false);
      return () => { cancelled = true; };
    }

    setRestrictionLoading(true);
    void supabase.rpc("my_account_restriction").then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("Could not check account restriction", error);
        setRestriction({ state: "active", public_reason: null, suspended_until: null });
      } else {
        const row = Array.isArray(data) ? data[0] : null;
        setRestriction((row || { state: "active", public_reason: null, suspended_until: null }) as Restriction);
      }
      setRestrictionLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || (user && (accessLoading || restrictionLoading))) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center px-4 text-center text-white">
        Loading your Neighborly account…
      </div>
    );
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/sign-in" replace state={{ from }} />;
  }

  if (approvalRequired && accessStatus !== "approved") {
    return (
      <AccessRequestScreen
        status={accessStatus === "declined" ? "declined" : accessStatus === "pending" ? "pending" : null}
        requestedAt={accessRequestedAt}
        error={accessError}
        refreshAccess={refreshAccess}
      />
    );
  }

  const suspensionActive = restriction?.state === "suspended"
    && (!restriction.suspended_until || new Date(restriction.suspended_until).getTime() > Date.now());
  if (restriction?.state === "banned" || suspensionActive) {
    return <AccountRestrictionScreen restriction={restriction} />;
  }

  return children ?? <Outlet />;
}
