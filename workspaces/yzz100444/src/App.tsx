import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ImportPage from '@/pages/ImportPage';
import AnalysisPage from '@/pages/AnalysisPage';
import TopicDetailPage from '@/pages/TopicDetailPage';
import ExportPage from '@/pages/ExportPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ImportPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/topic/:topicId" element={<TopicDetailPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </Router>
  );
}
