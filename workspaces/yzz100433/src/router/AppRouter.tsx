import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import Practice from '@/pages/Practice';
import Records from '@/pages/Records';
import ManagerLogin from '@/pages/ManagerLogin';
import ManagerDashboard from '@/pages/ManagerDashboard';
import { useAppStore } from '@/store/useAppStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isManagerMode } = useAppStore();
  return isManagerMode ? children : <Navigate to="/manager" replace />;
}

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice/:staffId" element={<Practice />} />
        <Route path="/records/:staffId" element={<Records />} />
        <Route path="/manager" element={<ManagerLogin />} />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
