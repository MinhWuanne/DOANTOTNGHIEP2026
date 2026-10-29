
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import {
  getAccessToken,
  getAuthRole,
} from "../utils/auth";

import type { AuthRole } from "../utils/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AuthRole[];
}

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const rolesToCheck: AuthRole[] = allowedRoles;
  const matchedRole = rolesToCheck.find((role) => {
    return Boolean(getAccessToken(role) && getAuthRole(role) === role);
  });

  if (!matchedRole) {
    const targetRole = allowedRoles[0];

    if (targetRole === "MEMBER") {
      return <Navigate to="/login" replace />;
    }

    if (targetRole === "FRANCHISE") {
      return <Navigate to="/franchise/login" replace />;
    }

    return <Navigate to="/qtv" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
