import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import RouteManagement from '@/pages/RouteManagement';
import RiderManagement from '@/pages/RiderManagement';
import SupplyManagement from '@/pages/SupplyManagement';
import CheckinRecords from '@/pages/CheckinRecords';
import RescueManagement from '@/pages/RescueManagement';
import LeaderView from '@/pages/LeaderView';
import SupplyVehicleView from '@/pages/SupplyVehicleView';
import MedicView from '@/pages/MedicView';
import ExportData from '@/pages/ExportData';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/routes" element={<RouteManagement />} />
            <Route path="/riders" element={<RiderManagement />} />
            <Route path="/supplies" element={<SupplyManagement />} />
            <Route path="/checkin" element={<CheckinRecords />} />
            <Route path="/rescue" element={<RescueManagement />} />
            <Route path="/leader" element={<LeaderView />} />
            <Route path="/supply-vehicle" element={<SupplyVehicleView />} />
            <Route path="/medic" element={<MedicView />} />
            <Route path="/export" element={<ExportData />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
