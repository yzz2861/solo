import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Toast from '@/components/Toast';
import Dashboard from '@/pages/Dashboard';
import RentPage from '@/pages/RentPage';
import ReturnPage from '@/pages/ReturnPage';
import EquipmentPage from '@/pages/EquipmentPage';
import ApprovalsPage from '@/pages/ApprovalsPage';
import ReportsPage from '@/pages/ReportsPage';

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rent" element={<RentPage />} />
          <Route path="/return" element={<ReturnPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AppLayout>
      <Toast />
    </Router>
  );
}
