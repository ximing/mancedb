import { Navigate } from 'react-router';
import { view } from '@rabjs/react';
import { connectionAuthService } from '../services/connection-auth.service';
import { isElectron } from '../utils/environment';

interface ConnectionProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Connection Protected Route Component
 * Redirects to connection list if user is not authenticated for a connection
 * In Electron mode, authentication is disabled so always allow access
 */
export const ConnectionProtectedRoute = view(({ children }: ConnectionProtectedRouteProps) => {
  // In Electron mode, authentication is disabled, so always allow access
  if (isElectron()) {
    return <>{children}</>;
  }

  if (!connectionAuthService.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});
