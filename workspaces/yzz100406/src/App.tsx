import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { UserRole } from '../shared/types.js';
import Layout from './components/Layout.js';
import Login from './pages/Login.js';
import AccidentList from './pages/AccidentList.js';
import AccidentDetail from './pages/AccidentDetail.js';
import ManagerDashboard from './pages/ManagerDashboard.js';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== UserRole.MANAGER) return <Navigate to="/accidents" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/accidents" replace />} />
        <Route
          path="/accidents"
          element={
            <PrivateRoute>
              <AccidentList />
            </PrivateRoute>
          }
        />
        <Route
          path="/accidents/new"
          element={
            <PrivateRoute>
              <AccidentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/accidents/:id"
          element={
            <PrivateRoute>
              <AccidentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ManagerRoute>
              <ManagerDashboard />
            </ManagerRoute>
          }
        />
      </Routes>
    </Router>
  );
}
