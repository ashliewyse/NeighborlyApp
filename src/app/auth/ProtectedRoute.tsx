import { type ReactNode, useEffect, useState } from "react";
import { Clock3, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/app/auth/AuthProvider";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";
import { supabase } from "@/lib/supabase";

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

  if (loading || (user && accessLoading)) {
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

  return children ?? <Outlet />;
}
