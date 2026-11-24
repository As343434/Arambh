import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { normalizeRole, Permission } from '../config/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  requiredPermissions
}) => {
  const { user, profile, normalizedRole, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFFFFF] dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-200 dark:border-zinc-800 border-t-[#111111]" />
          <p className="text-xs font-medium text-[#52525B] dark:text-zinc-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.isFirstLogin && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredPermission && profile && !can(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0 && profile) {
    const hasAny = requiredPermissions.some(p => can(p));
    if (!hasAny) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (allowedRoles && profile) {
    const allowedNormalized = allowedRoles.map(r => normalizeRole(r));
    if (!allowedNormalized.includes(normalizedRole) && normalizedRole !== 'super_admin') {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
