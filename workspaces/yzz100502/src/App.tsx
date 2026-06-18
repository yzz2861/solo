import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { ImportPage } from './pages/nurse/ImportPage';
import { AnalysisPage } from './pages/nurse/AnalysisPage';
import { ReviewPage } from './pages/nurse/ReviewPage';
import { DoctorWorkspace } from './pages/doctor/DoctorWorkspace';
import { HistoryPage } from './pages/doctor/HistoryPage';
import { useAuthStore } from './store/authStore';
import type { UserRole } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, hasPermission } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasPermission(requiredRole)) {
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser?.role === 'nurse') {
      return <Navigate to="/nurse/import" replace />;
    } else {
      return <Navigate to="/doctor/workspace" replace />;
    }
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/nurse/import"
          element={
            <ProtectedRoute requiredRole="nurse">
              <ImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nurse/analysis"
          element={
            <ProtectedRoute requiredRole="nurse">
              <AnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nurse/review"
          element={
            <ProtectedRoute requiredRole="nurse">
              <ReviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/workspace"
          element={
            <ProtectedRoute requiredRole="doctor">
              <DoctorWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/history"
          element={
            <ProtectedRoute requiredRole="doctor">
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
