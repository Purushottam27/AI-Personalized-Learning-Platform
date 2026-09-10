import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../features/auth/pages/LoginPage';
import SignupPage from '../features/auth/pages/SignupPage';
import { LearnerDashboard, InstructorDashboard, AdminDashboard } from '../pages/dashboards/PlaceholderDashboards';
import { AuthProvider } from '../features/auth/AuthContext';
import GuestRoute from '../routes/GuestRoute';
import ProtectedRoute from '../routes/ProtectedRoute';
import OnboardingRoute from '../routes/OnboardingRoute';
import OnboardingGuard from '../routes/OnboardingGuard';
import '../App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes with nav/footer layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Guest-only routes (redirect authenticated users to dashboard) */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Onboarding — protected (must be authenticated), role-routed */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingRoute />} />
          </Route>

          {/* Protected dashboard routes — onboarding must be complete */}
          <Route element={<ProtectedRoute />}>
            <Route element={<OnboardingGuard />}>
              <Route path="/learner-dashboard" element={<LearnerDashboard />} />
              <Route path="/instructor-dashboard" element={<InstructorDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />

              {/* Legacy paths for backward compat */}
              <Route path="/learner/dashboard" element={<LearnerDashboard />} />
              <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;