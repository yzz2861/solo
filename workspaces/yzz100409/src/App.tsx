import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import InputPage from './pages/InputPage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-paper">
        <NavBar />
        <main className="pb-16">
          <Routes>
            <Route path="/" element={<InputPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<InputPage />} />
          </Routes>
        </main>
        <footer className="border-t border-greenhouse-50 bg-white/60 py-5">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs text-greenhouse-500">
              🍅 温室灌溉智能估算 · 基于 FAO Penman-Monteith 公式 · 番茄专用作物系数表
            </p>
            <p className="text-[10px] text-greenhouse-400 mt-1">
              数据存储在浏览器本地，仅供参考，实际操作请结合田间经验与农技员意见
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
