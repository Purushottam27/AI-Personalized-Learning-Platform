/**
 * GuestRoute — only accessible to unauthenticated users.
 * Authenticated users are redirected based on their onboarding state:
 * - Onboarding incomplete → /onboarding
 * - Onboarding complete → role dashboard
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { resolveAuthDestination } from '../features/auth/utils/resolveAuthDestination';

export default function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && user) {
      setIsResolving(true);
      resolveAuthDestination(user.role).then(dest => {
        if (!cancelled) setDestination(dest);
      }).catch(() => {
        if (!cancelled) setDestination('/');
      }).finally(() => {
        if (!cancelled) setIsResolving(false);
      });
    }
    return () => { cancelled = true; };
  }, [isAuthenticated, user]);

  if (isLoading || isResolving) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <span className="text-muted text-sm font-sans">Loading…</span>
      </div>
    );
  }

  if (isAuthenticated && destination) {
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
