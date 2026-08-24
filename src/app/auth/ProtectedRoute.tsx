import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/app/auth/AuthProvider";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  return <Outlet />;
}
