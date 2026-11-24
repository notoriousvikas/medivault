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
import MedicalTimelinePage from './pages/MedicalTimelinePage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import ImagingScansPage from './pages/ImagingScansPage';
import JagrutiAlertsPage from './pages/JagrutiAlertsPage';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import PranaSetuPage from './pages/PranaSetuPage';

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
              {/* Home & Authentication */}
              <Route path="/" element={<HomeRoute />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Main Dashboard & Vault Aliases */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vault" element={<Navigate to="/dashboard" replace />} />

              {/* Medical Timeline (supports 3000/medicalTimeline as requested) */}
              <Route path="/medicalTimeline" element={<MedicalTimelinePage />} />
              <Route path="/medicaltimeline" element={<MedicalTimelinePage />} />
              <Route path="/medical-timeline" element={<MedicalTimelinePage />} />
              <Route path="/timeline" element={<MedicalTimelinePage />} />

              {/* AI Prescriptions */}
              <Route path="/aiPrescriptions" element={<PrescriptionsPage />} />
              <Route path="/aiprescriptions" element={<PrescriptionsPage />} />
              <Route path="/ai-prescriptions" element={<PrescriptionsPage />} />
              <Route path="/prescriptions" element={<PrescriptionsPage />} />

              {/* Imaging & X-Ray Scans */}
              <Route path="/imagingScans" element={<ImagingScansPage />} />
              <Route path="/imagingscans" element={<ImagingScansPage />} />
              <Route path="/imaging-scans" element={<ImagingScansPage />} />
              <Route path="/imaging" element={<ImagingScansPage />} />
              <Route path="/scans" element={<ImagingScansPage />} />

              {/* Jagruti Community Health & Risk Alerts */}
              <Route path="/jagrutiAlerts" element={<JagrutiAlertsPage />} />
              <Route path="/jagrutialerts" element={<JagrutiAlertsPage />} />
              <Route path="/jagruti-alerts" element={<JagrutiAlertsPage />} />
              <Route path="/jagruti" element={<JagrutiAlertsPage />} />
              <Route path="/alerts" element={<JagrutiAlertsPage />} />

              {/* Medical Records Vault */}
              <Route path="/medicalRecords" element={<MedicalRecordsPage />} />
              <Route path="/medicalrecords" element={<MedicalRecordsPage />} />
              <Route path="/medical-records" element={<MedicalRecordsPage />} />
              <Route path="/records" element={<MedicalRecordsPage />} />

              {/* PranaSetu Emergency QR Access */}
              <Route path="/pranaSetu" element={<PranaSetuPage />} />
              <Route path="/pranasetu" element={<PranaSetuPage />} />
              <Route path="/prana-setu" element={<PranaSetuPage />} />

              {/* Consultations & Chat */}
              <Route path="/consultations" element={<DoctorChatPage />} />
              <Route path="/chat" element={<Navigate to="/consultations" replace />} />

              {/* Record Detail, Portals & Admin */}
              <Route path="/records/:id" element={<RecordDetailPage />} />
              <Route path="/shared-portal" element={<SharedPortalPage />} />
              <Route path="/emergency/:token" element={<EmergencyPublicPage />} />
              <Route path="/admin" element={<AdminPage />} />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </Router>
  );
}
