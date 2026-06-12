import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Home from '@/pages/Home';
import ImportPage from '@/pages/ImportPage';
import AnalysisPage from '@/pages/AnalysisPage';
import ReportPage from '@/pages/ReportPage';
import WorksPage from '@/pages/WorksPage';
import Sidebar from '@/components/Sidebar';
import { useFiringStore } from '@/store/firingStore';

export default function App() {
  const { init, isLoading, records } = useFiringStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clay-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-kiln-gradient flex items-center justify-center mx-auto mb-4 shadow-warm animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-white">
              <path d="M12 2v6M5 10h14l-1 10H6L5 10zM12 16c-2 0-3-1-3-3s1-3 3-3 3 1 3 3-1 3-3 3z" />
            </svg>
          </div>
          <p className="text-kiln-600 font-display font-semibold mb-1">窑火 · 陶瓷烧成曲线分析系统</p>
          <p className="text-xs text-kiln-500">正在加载...</p>
        </div>
      </div>
    );
  }

  const firstRecordId = records[0]?.id;

  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/import" element={<ImportPage />} />
            <Route
              path="/analysis"
              element={
                firstRecordId ? (
                  <Navigate to={`/analysis/${firstRecordId}`} replace />
                ) : (
                  <Navigate to="/import" replace />
                )
              }
            />
            <Route path="/analysis/:id" element={<AnalysisPage />} />
            <Route
              path="/report"
              element={
                firstRecordId ? (
                  <Navigate to={`/report/${firstRecordId}`} replace />
                ) : (
                  <Navigate to="/import" replace />
                )
              }
            />
            <Route path="/report/:id" element={<ReportPage />} />
            <Route
              path="/works"
              element={
                firstRecordId ? (
                  <Navigate to={`/works/${firstRecordId}`} replace />
                ) : (
                  <Navigate to="/import" replace />
                )
              }
            />
            <Route path="/works/:id" element={<WorksPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
