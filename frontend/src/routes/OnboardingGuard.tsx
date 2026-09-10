import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { resolveAuthDestination } from '../features/auth/utils/resolveAuthDestination';

/**
 * OnboardingGuard — protects dashboard routes by ensuring the user
 * has completed onboarding. If not, redirects them to /onboarding.
 */
export default function OnboardingGuard() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user) {
      resolveAuthDestination(user.role).then(destination => {
        if (!cancelled) {
          if (destination === '/onboarding') {
            setNeedsOnboarding(true);
          }
          setIsChecking(false);
        }
      }).catch(() => {
        if (!cancelled) setIsChecking(false);
      });
    } else {
      setIsChecking(false);
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal"></div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
