import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import DashboardPage from '@/pages/DashboardPage';
import DataImportPage from '@/pages/DataImportPage';
import BuildingDetailPage from '@/pages/BuildingDetailPage';
import RepairReportPage from '@/pages/RepairReportPage';
import SettingsPage from '@/pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/import" element={<DataImportPage />} />
          <Route path="/building/:id" element={<BuildingDetailPage />} />
          <Route path="/report/:buildingId" element={<RepairReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
