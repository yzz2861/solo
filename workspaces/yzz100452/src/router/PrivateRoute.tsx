import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore, type UserRole } from "@/store/authStore";

interface PrivateRouteProps {
  allowedRoles: UserRole[];
}

export default function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { currentUser, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
