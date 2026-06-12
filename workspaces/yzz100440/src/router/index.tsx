import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { NurseDashboard } from '../pages/nurse/Dashboard';
import { FloorAnalysis } from '../pages/nurse/FloorAnalysis';
import { ImportCenter } from '../pages/nurse/ImportCenter';
import { FamilyDashboard } from '../pages/family/Dashboard';
import { ElderlyDetail } from '../pages/ElderlyDetail';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { useEffect } from 'react';

function RedirectToDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'nurse') {
    return <Navigate to="/nurse/dashboard" replace />;
  } else {
    return <Navigate to="/family/dashboard" replace />;
  }
}

export function AppRouter() {
  const { loadMockData } = useDataStore();
  
  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RedirectToDashboard />} />
        <Route path="/nurse/dashboard" element={<NurseDashboard />} />
        <Route path="/nurse/floor" element={<FloorAnalysis />} />
        <Route path="/import" element={<ImportCenter />} />
        <Route path="/family/dashboard" element={<FamilyDashboard />} />
        <Route path="/elderly/:id" element={<ElderlyDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
