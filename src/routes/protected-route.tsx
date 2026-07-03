import { Navigate, Outlet, useLocation } from "react-router";
import { paths } from "@/routes/paths";
import { authStore } from "@/store/auth-store";

export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = authStore.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
