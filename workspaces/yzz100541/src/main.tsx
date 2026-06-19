import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import ManagerDashboard from './pages/Manager/Dashboard/ManagerDashboard';
import OrderPlanPage from './pages/Manager/OrderPlan/OrderPlanPage';
import WasteReportPage from './pages/Manager/WasteReport/WasteReportPage';
import WasteAnalyticsPage from './pages/Manager/WasteAnalytics/WasteAnalyticsPage';
import SupervisorDashboard from './pages/Supervisor/Dashboard/SupervisorDashboard';
import SupervisorReport from './pages/Supervisor/Report/SupervisorReport';
import StaffOrderView from './pages/Staff/Order/StaffOrderView';
import DataImportPage from './pages/DataImport/DataImportPage';
import './index.css';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole: 'manager' | 'supervisor' | 'staff' }) {
  const { state } = useApp();
  if (!state.userRole) return <Navigate to="/" replace />;
  if (state.userRole !== requiredRole) {
    if (state.userRole === 'manager') return <Navigate to="/manager/dashboard" replace />;
    if (state.userRole === 'supervisor') return <Navigate to="/supervisor/dashboard" replace />;
    return <Navigate to="/staff/order" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { state } = useApp();

  return (
    <Routes>
      <Route path="/" element={state.userRole ? <Navigate to={state.userRole === 'manager' ? '/manager/dashboard' : state.userRole === 'supervisor' ? '/supervisor/dashboard' : '/staff/order'} replace /> : <LoginPage />} />

      <Route path="/manager" element={<ProtectedRoute requiredRole="manager"><AppLayout role="manager" /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="order" element={<OrderPlanPage />} />
        <Route path="waste" element={<WasteReportPage />} />
        <Route path="analytics" element={<WasteAnalyticsPage />} />
      </Route>

      <Route path="/supervisor" element={<ProtectedRoute requiredRole="supervisor"><AppLayout role="supervisor" /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="report" element={<SupervisorReport />} />
      </Route>

      <Route path="/staff" element={<ProtectedRoute requiredRole="staff"><AppLayout role="staff" /></ProtectedRoute>}>
        <Route index element={<Navigate to="order" replace />} />
        <Route path="order" element={<StaffOrderView />} />
      </Route>

      <Route path="/data" element={<AppLayout role={state.userRole || 'manager'} />}>
        <Route path="import" element={<DataImportPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
