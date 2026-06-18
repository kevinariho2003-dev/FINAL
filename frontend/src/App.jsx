import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Suspense, lazy } from 'react';

// Auth pages
const Landing = lazy(() => import('./pages/auth/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Dashboards
const DonorDashboard = lazy(() => import('./pages/donor/DonorDashboard'));
const RecipientDashboard = lazy(() => import('./pages/recipient/RecipientDashboard'));
const ClinicianDashboard = lazy(() => import('./pages/clinician/ClinicianDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Donor pages
const DonorProfileForm = lazy(() => import('./pages/donor/DonorProfileForm'));
const DonorConsentForm = lazy(() => import('./pages/donor/DonorConsentForm'));
const DonorScreening = lazy(() => import('./pages/donor/DonorScreening'));
const DonorCycles = lazy(() => import('./pages/donor/DonorCycles'));

// Recipient pages
const RecipientProfileForm = lazy(() => import('./pages/recipient/RecipientProfileForm'));
const RecipientConsentForm = lazy(() => import('./pages/recipient/RecipientConsentForm'));
const RecipientMatchList = lazy(() => import('./pages/recipient/RecipientMatchList'));

// Clinician pages
const ClinicianDonorList = lazy(() => import('./pages/clinician/ClinicianDonorList'));
const ClinicianRecipientList = lazy(() => import('./pages/clinician/ClinicianRecipientList'));
const ClinicianMatchReview = lazy(() => import('./pages/clinician/ClinicianMatchReview'));
const ClinicianCycles = lazy(() => import('./pages/clinician/ClinicianCycles'));

// Admin pages
const AdminUserManagement = lazy(() => import('./pages/admin/AdminUserManagement'));
const AdminMatchingConfig = lazy(() => import('./pages/admin/AdminMatchingConfig'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const MomoValidation = lazy(() => import('./pages/payment/MomoValidation'));

/* ── Floating Background SVGs ── */
function FloatingBackground() {
  return (
    <div className="floating-bg" aria-hidden="true">
      <svg className="float-shape float-shape-1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="rgba(16,185,129,0.06)" />
      </svg>
      <svg className="float-shape float-shape-2" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="160" height="160" rx="40" fill="rgba(99,102,241,0.05)" />
      </svg>
      <svg className="float-shape float-shape-3" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <polygon points="100,10 190,150 10,150" fill="rgba(236,72,153,0.04)" />
      </svg>
      <svg className="float-shape float-shape-4" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="60" fill="rgba(139,92,246,0.05)" />
      </svg>
      <svg className="float-shape float-shape-5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="30" width="140" height="140" rx="30" fill="rgba(16,185,129,0.04)" />
      </svg>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  const SuspenseWrapper = ({ children }) => (
    <Suspense fallback={<div className="page-loader"><div className="spinner"></div></div>}>
      {children}
    </Suspense>
  );

  if (location.pathname === '/momo-validation') {
    return (
      <Routes>
        <Route path="/momo-validation" element={<SuspenseWrapper><MomoValidation /></SuspenseWrapper>} />
      </Routes>
    );
  }

  /* Public pages — no navbar, no footer override */
  if (!user) {
    return (
      <SuspenseWrapper>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SuspenseWrapper>
    );
  }

  /* Authenticated — top navbar + content area */
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <FloatingBackground />
        <div className="app-content-inner">
          <SuspenseWrapper>
            <Routes>
              <Route path="/" element={<Navigate to={`/${user.role}/dashboard`} />} />
            <Route path="/login" element={<Navigate to={`/${user.role}/dashboard`} />} />
            <Route path="/register" element={<Navigate to={`/${user.role}/dashboard`} />} />

            {/* Donor */}
            <Route path="/donor/dashboard" element={<ProtectedRoute roles={['donor']}><DonorDashboard /></ProtectedRoute>} />
            <Route path="/donor/profile" element={<ProtectedRoute roles={['donor']}><DonorProfileForm /></ProtectedRoute>} />
            <Route path="/donor/consents" element={<ProtectedRoute roles={['donor']}><DonorConsentForm /></ProtectedRoute>} />
            <Route path="/donor/screening" element={<ProtectedRoute roles={['donor']}><DonorScreening /></ProtectedRoute>} />
            <Route path="/donor/cycles" element={<ProtectedRoute roles={['donor']}><DonorCycles /></ProtectedRoute>} />

            {/* Recipient */}
            <Route path="/recipient/dashboard" element={<ProtectedRoute roles={['recipient']}><RecipientDashboard /></ProtectedRoute>} />
            <Route path="/recipient/profile" element={<ProtectedRoute roles={['recipient']}><RecipientProfileForm /></ProtectedRoute>} />
            <Route path="/recipient/consents" element={<ProtectedRoute roles={['recipient']}><RecipientConsentForm /></ProtectedRoute>} />
            <Route path="/recipient/matches" element={<ProtectedRoute roles={['recipient']}><RecipientMatchList /></ProtectedRoute>} />

            {/* Clinician — medical data access (clinician ONLY, no admin) */}
            <Route path="/clinician/dashboard" element={<ProtectedRoute roles={['clinician']}><ClinicianDashboard /></ProtectedRoute>} />
            <Route path="/clinician/donors" element={<ProtectedRoute roles={['clinician']}><ClinicianDonorList /></ProtectedRoute>} />
            <Route path="/clinician/recipients" element={<ProtectedRoute roles={['clinician']}><ClinicianRecipientList /></ProtectedRoute>} />
            <Route path="/clinician/matches" element={<ProtectedRoute roles={['clinician']}><ClinicianMatchReview /></ProtectedRoute>} />
            <Route path="/clinician/cycles" element={<ProtectedRoute roles={['clinician']}><ClinicianCycles /></ProtectedRoute>} />

            {/* Admin — system & user management only */}
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUserManagement /></ProtectedRoute>} />
            <Route path="/admin/matching-config" element={<ProtectedRoute roles={['admin']}><AdminMatchingConfig /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to={`/${user.role}/dashboard`} replace />} />
            </Routes>
          </SuspenseWrapper>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
