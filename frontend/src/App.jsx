import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

// Auth pages
import Landing from './pages/auth/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboards
import DonorDashboard from './pages/donor/DonorDashboard';
import RecipientDashboard from './pages/recipient/RecipientDashboard';
import ClinicianDashboard from './pages/clinician/ClinicianDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Donor pages
import DonorProfileForm from './pages/donor/DonorProfileForm';
import DonorConsentForm from './pages/donor/DonorConsentForm';
import DonorScreening from './pages/donor/DonorScreening';
import DonorCycles from './pages/donor/DonorCycles';

// Recipient pages
import RecipientProfileForm from './pages/recipient/RecipientProfileForm';
import RecipientMatchList from './pages/recipient/RecipientMatchList';

// Clinician pages
import ClinicianDonorList from './pages/clinician/ClinicianDonorList';
import ClinicianRecipientList from './pages/clinician/ClinicianRecipientList';
import ClinicianMatchReview from './pages/clinician/ClinicianMatchReview';
import ClinicianCycles from './pages/clinician/ClinicianCycles';

// Admin pages
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminMatchingConfig from './pages/admin/AdminMatchingConfig';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

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

  /* Public pages — no sidebar, no footer override */
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /* Authenticated — sidebar + content area */
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <FloatingBackground />
        <div className="app-content-inner">
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
            <Route path="/recipient/matches" element={<ProtectedRoute roles={['recipient']}><RecipientMatchList /></ProtectedRoute>} />

            {/* Clinician */}
            <Route path="/clinician/dashboard" element={<ProtectedRoute roles={['clinician']}><ClinicianDashboard /></ProtectedRoute>} />
            <Route path="/clinician/donors" element={<ProtectedRoute roles={['clinician', 'admin']}><ClinicianDonorList /></ProtectedRoute>} />
            <Route path="/clinician/recipients" element={<ProtectedRoute roles={['clinician', 'admin']}><ClinicianRecipientList /></ProtectedRoute>} />
            <Route path="/clinician/matches" element={<ProtectedRoute roles={['clinician', 'admin']}><ClinicianMatchReview /></ProtectedRoute>} />
            <Route path="/clinician/cycles" element={<ProtectedRoute roles={['clinician', 'admin']}><ClinicianCycles /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUserManagement /></ProtectedRoute>} />
            <Route path="/admin/matching-config" element={<ProtectedRoute roles={['admin']}><AdminMatchingConfig /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />
            <Route path="/admin/cycles" element={<ProtectedRoute roles={['admin']}><ClinicianCycles /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to={`/${user.role}/dashboard`} replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
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
