import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../features/auth/pages/LoginPage';
import SignupPage from '../features/auth/pages/SignupPage';
import { AdminDashboard } from '../pages/dashboards/PlaceholderDashboards';
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

// Instructor App
import InstructorLayout from '../features/instructor/layouts/InstructorLayout';
import { InstructorDashboardPage } from '../features/instructor/pages/InstructorDashboardPage';
import {InstructorCoursesPage} from '../features/instructor/pages/InstructorCoursesPage';
import { CreateCoursePage } from '../features/instructor/pages/CreateCoursePage';
import { CourseWorkspacePage } from '../features/instructor/pages/CourseWorkspacePage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
            </Route>

            {/* Guest-only routes */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Authenticated onboarding */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingRoute />} />
            </Route>

            {/* Protected application routes; onboarding must be complete */}
            <Route element={<ProtectedRoute />}>
              <Route element={<OnboardingGuard />}>
                {/* Legacy paths */}
                <Route path="/learner-dashboard" element={<Navigate to="/learner/dashboard" replace />} />
                <Route path="/instructor-dashboard" element={<Navigate to="/instructor/dashboard" replace />} />

                {/* Learner application */}
                <Route path="/learner" element={<LearnerLayout />}>
                  <Route path="dashboard" element={<LearnerDashboardPage />} />
                  <Route path="courses" element={<PlaceholderPage title="My Courses" description="View and manage your active and completed courses." />} />
                  <Route path="explore" element={<PlaceholderPage title="Explore" description="Discover new courses tailored to your interests and level." />} />
                  <Route path="recommended" element={<PlaceholderPage title="Recommended" description="AI-powered learning recommendations based on your profile." />} />
                  <Route path="analytics" element={<PlaceholderPage title="Analytics" description="Deep insights into your learning progress and mastery." />} />
                  <Route path="profile" element={<PlaceholderPage title="Profile & Settings" description="Manage your account, preferences, and learning profile." />} />
                </Route>

                {/* Instructor application */}
                <Route path="/instructor" element={<InstructorLayout />}>
                  <Route path="dashboard" element={<InstructorDashboardPage />} />
                  <Route path="courses" element={<InstructorCoursesPage />} />
                  <Route path="courses/create" element={<CreateCoursePage />} />
                  {/* Keep this route above the generic :courseId route. */}
                  <Route path="courses/:courseId/setup" element={<CreateCoursePage />} />
                  <Route path="courses/:courseId" element={<CourseWorkspacePage />} />
                  <Route path="learners" element={<PlaceholderPage title="Learners" description="Manage learners enrolled in your courses." />} />
                  <Route path="analytics" element={<PlaceholderPage title="Analytics" description="Insights into learner performance and course metrics." />} />
                  <Route path="profile" element={<PlaceholderPage title="Profile & Settings" description="Manage your instructor profile and account settings." />} />
                </Route>

                {/* Admin routes */}
                <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
