import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { NavTabs } from '@/components/layout/NavTabs';
import Calculator from '@/pages/Calculator';
import ContractorReportPage from '@/pages/ContractorReportPage';
import OwnerReportPage from '@/pages/OwnerReportPage';
import History from '@/pages/History';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-100">
        <Header />
        <NavTabs />
        <main className="pb-12">
          <Routes>
            <Route path="/" element={<Calculator />} />
            <Route path="/report/contractor" element={<ContractorReportPage />} />
            <Route path="/report/owner" element={<OwnerReportPage />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
        <footer className="bg-zinc-800 text-zinc-400 text-sm py-4 text-center">
          <p>雨棚排水坡度核算系统 · 技术交底有据可查</p>
        </footer>
      </div>
    </Router>
  );
}
