import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../features/auth/pages/LoginPage';
import SignupPage from '../features/auth/pages/SignupPage';
import {
  InstructorDashboard,
  AdminDashboard,
} from '../pages/dashboards/PlaceholderDashboards';
import { AuthProvider } from '../features/auth/AuthContext';
import GuestRoute from '../routes/GuestRoute';
import ProtectedRoute from '../routes/ProtectedRoute';
import OnboardingRoute from '../routes/OnboardingRoute';
import OnboardingGuard from '../routes/OnboardingGuard';
import { ThemeProvider } from './ThemeProvider';
import '../App.css';

// Learner App
import LearnerLayout from '../layouts/LearnerLayout';
import { LearnerDashboardPage } from '../features/learner/pages/LearnerDashboardPage';
import { PlaceholderPage } from '../features/learner/pages/PlaceholderPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
                
                {/* Legacy paths for backward compat */}
                <Route path="/learner-dashboard" element={<Navigate to="/learner/dashboard" replace />} />
                
                {/* Learner Application Shell */}
                <Route path="/learner" element={<LearnerLayout />}>
                  <Route path="dashboard" element={<LearnerDashboardPage />} />
                  <Route path="courses" element={<PlaceholderPage title="My Courses" description="View and manage your active and completed courses." />} />
                  <Route path="explore" element={<PlaceholderPage title="Explore" description="Discover new courses tailored to your interests and level." />} />
                  <Route path="recommended" element={<PlaceholderPage title="Recommended" description="AI-powered learning recommendations based on your profile." />} />
                  <Route path="analytics" element={<PlaceholderPage title="Analytics" description="Deep insights into your learning progress and mastery." />} />
                  <Route path="profile" element={<PlaceholderPage title="Profile & Settings" description="Manage your account, preferences, and learning profile." />} />
                </Route>

                <Route
                  path="/instructor-dashboard"
                  element={<InstructorDashboard />}
                />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />

                {/* Legacy paths for backward compat */}
                <Route
                  path="/instructor/dashboard"
                  element={<InstructorDashboard />}
                />
                <Route
                  path="/admin/dashboard"
                  element={<AdminDashboard />}
                />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;