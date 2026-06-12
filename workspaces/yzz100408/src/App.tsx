import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import OverviewPage from '@/pages/OverviewPage';
import AnalysisPage from '@/pages/AnalysisPage';
import AttributionPage from '@/pages/AttributionPage';
import StationMasterPage from '@/pages/StationMasterPage';
import ReportPage from '@/pages/ReportPage';
import ImportPage from '@/pages/ImportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/import" element={<ImportPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/attribution" element={<AttributionPage />} />
          <Route path="/station-master" element={<StationMasterPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
