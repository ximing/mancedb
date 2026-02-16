interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Component
 * Authentication has been removed - all routes are now accessible
 * @deprecated Authentication removed, this component now just renders children
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Authentication removed - always allow access
  return <>{children}</>;
};
