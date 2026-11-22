import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import RecordDetailPage from './pages/RecordDetailPage';
import SharedPortalPage from './pages/SharedPortalPage';
import EmergencyPublicPage from './pages/EmergencyPublicPage';
import AdminPage from './pages/AdminPage';
import DoctorChatPage from './pages/DoctorChatPage';
import NotFoundPage from './pages/NotFoundPage';

function HomeRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-trust-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">
          Loading AyuRaksha...
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/consultations" element={<DoctorChatPage />} />
              <Route path="/chat" element={<Navigate to="/consultations" replace />} />
              <Route path="/records/:id" element={<RecordDetailPage />} />
              <Route path="/shared-portal" element={<SharedPortalPage />} />
              <Route path="/emergency/:token" element={<EmergencyPublicPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </Router>
  );
}
