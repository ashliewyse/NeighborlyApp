import { lazy, Suspense, useCallback } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router";
import { AuthView } from "@/app/components/AuthView";
import { WelcomePage } from "@/app/components/WelcomePage";
import { useAuth } from "@/app/auth/AuthProvider";
import { ProtectedRoute } from "@/app/auth/ProtectedRoute";

type AuthMode = "signin" | "signup";
type AuthScreen = "form" | "forgot" | "recovery";
const App = lazy(() => import("@/app/App"));

function AppContent() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">Loading Neighborly…</div>}>
      <App />
    </Suspense>
  );
}

function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">Loading Neighborly…</div>;
  }

  return user ? <ProtectedRoute><AppContent /></ProtectedRoute> : <WelcomePage />;
}

function AuthPage({ mode, initialScreen = "form" }: { mode: AuthMode; initialScreen?: AuthScreen }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const requestedPath =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : mode === "signup"
        ? "/profile"
        : "/";

  const handleSuccess = useCallback(() => {
    navigate(requestedPath, { replace: true });
  }, [navigate, requestedPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">
        Checking your account…
      </div>
    );
  }

  if (user && initialScreen !== "recovery") {
    return <Navigate to={requestedPath} replace />;
  }

  return (
    <AuthView
      mode={mode}
      initialScreen={initialScreen}
      onSwitchMode={(nextMode) => navigate(nextMode === "signin" ? "/sign-in" : "/sign-up", { replace: true })}
      onSuccess={handleSuccess}
    />
  );
}

function SignupPreviewPage() {
  const navigate = useNavigate();

  return (
    <AuthView
      mode="signup"
      previewMode
      onSwitchMode={() => undefined}
      onSuccess={() => navigate("/", { replace: true })}
    />
  );
}

function AuthCallbackPage() {
  const { user, loading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get("next") || "/profile";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/profile";

  if (!loading && user) return <Navigate to={next} replace />;

  const callbackError = searchParams.get("error_description") || error;
  if (!loading && callbackError) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
          <h1 className="text-xl font-bold">We could not confirm that link</h1>
          <p className="mt-2 text-sm text-muted-foreground">{callbackError}</p>
          <a href="/sign-in" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-950 flex items-center justify-center px-4 text-center text-white">
      Finishing your secure sign-in…
    </div>
  );
}

export function AppRouter() {
  const location = useLocation();
  const hashParams = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
  const queryParams = new URLSearchParams(location.search);
  const isRecoveryLink = hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery";

  // Supabase falls back to the configured Site URL when a redirect URL is not allow-listed.
  // Preserve password recovery even in that case by routing the recovery fragment here.
  if (isRecoveryLink && location.pathname !== "/reset-password") {
    return <Navigate to={`/reset-password${location.search}${location.hash}`} replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sign-in" element={<AuthPage mode="signin" />} />
      <Route path="/sign-up" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="signin" initialScreen="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="signin" initialScreen="recovery" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/sign-up-preview" element={<SignupPreviewPage />} />
        <Route
          path="/*"
          element={<AppContent />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
