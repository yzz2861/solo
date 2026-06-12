import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Home from '@/pages/Home';
import OverviewPage from '@/pages/OverviewPage';
import MappingPage from '@/pages/MappingPage';
import VillageReportPage from '@/pages/VillageReportPage';
import WellDetailPage from '@/pages/WellDetailPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/mapping" element={<MappingPage />} />
          <Route path="/village/:villageId" element={<VillageReportPage />} />
          <Route path="/well/:wellId" element={<WellDetailPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Router>
  );
}
