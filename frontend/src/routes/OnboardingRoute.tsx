import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import LearnerOnboardingPage from '../features/onboarding/pages/LearnerOnboardingPage';
import InstructorOnboardingPage from '../features/onboarding/pages/InstructorOnboardingPage';

export default function OnboardingRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (user.role === 'LEARNER') {
    return <LearnerOnboardingPage />;
  }

  if (user.role === 'INSTRUCTOR') {
    return <InstructorOnboardingPage />;
  }

  // Fallback
  return <Navigate to="/" replace />;
}
