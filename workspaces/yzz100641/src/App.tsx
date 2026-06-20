import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import IntakePage from './pages/Intake';
import GradingDetailPage from './pages/GradingDetail';
import DutyPage from './pages/Duty';
import ReferralsPage from './pages/Referrals';
import ExportPage from './pages/Export';
import { initializeMockData } from './data/mockData';

function AppContent() {
  useEffect(() => {
    initializeMockData();
  }, []);
  
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/intake" element={<IntakePage />} />
        <Route path="/intake/:id" element={<GradingDetailPage />} />
        <Route path="/duty" element={<DutyPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
