import { Navigate } from 'react-router';
import { view } from '@rabjs/react';
import { connectionAuthService } from '../services/connection-auth.service';

interface ConnectionProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Connection Protected Route Component
 * Redirects to connection list if user is not authenticated for a connection
 */
export const ConnectionProtectedRoute = view(({ children }: ConnectionProtectedRouteProps) => {
  if (!connectionAuthService.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});
