/**
 * ProtectedRoute — requires an authenticated user.
 * Redirects unauthenticated visitors to /login.
 * Shows a loading state while the initial auth check is in progress.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Avoid a flash-redirect while the initial /me request is in-flight
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <span className="text-muted text-sm font-sans">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
