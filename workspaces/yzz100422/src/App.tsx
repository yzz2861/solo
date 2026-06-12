import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import GamePage from '@/pages/Game';
import ResultPage from '@/pages/Result';
import ProgressPage from '@/pages/Progress';
import TeacherBlocksPage from '@/pages/Teacher/Blocks';
import TeacherStatsPage from '@/pages/Teacher/Stats';
import { useBlockStore } from '@/store/blockStore';
import { useStatsStore } from '@/store/statsStore';

export default function App() {
  const loadBlocks = useBlockStore((state) => state.loadBlocks);
  const loadStats = useStatsStore((state) => state.loadStats);

  useEffect(() => {
    loadBlocks();
    loadStats();
  }, [loadBlocks, loadStats]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:blockId" element={<GamePage />} />
        <Route path="/result/:sessionId" element={<ResultPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/teacher/blocks" element={<TeacherBlocksPage />} />
        <Route path="/teacher/stats" element={<TeacherStatsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-gray-500 mb-6">页面不存在</p>
        <a href="/" className="btn btn-primary">
          返回首页
        </a>
      </div>
    </div>
  );
}
