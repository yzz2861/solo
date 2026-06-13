import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import ImportPage from '@/pages/ImportPage';
import AnalyzePage from '@/pages/AnalyzePage';
import ConfirmPage from '@/pages/ConfirmPage';
import HRDashboardPage from '@/pages/HRDashboardPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ImportPage />} />
            <Route path="/analyze/:id" element={<AnalyzePage />} />
            <Route path="/confirm/:id" element={<ConfirmPage />} />
            <Route path="/hr-dashboard" element={<HRDashboardPage />} />
            <Route path="*" element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
