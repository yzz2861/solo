import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import HomePage from '@/pages/HomePage';
import ReservationPage from '@/pages/ReservationPage';
import SchedulePage from '@/pages/SchedulePage';
import MaintenancePage from '@/pages/MaintenancePage';
import DriverViewPage from '@/pages/DriverViewPage';
import ExportPage from '@/pages/ExportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/reservation" element={<ReservationPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/driver" element={<DriverViewPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </Router>
  );
}
