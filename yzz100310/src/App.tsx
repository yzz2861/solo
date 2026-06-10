import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ImportPage from '@/pages/ImportPage';
import RecordList from '@/pages/RecordList';
import RecordDetail from '@/pages/RecordDetail';
import ReviewPage from '@/pages/ReviewPage';
import ReportPage from '@/pages/ReportPage';
import { useLibraryStore } from '@/store/useLibraryStore';

function App() {
  const initFromStorage = useLibraryStore((s) => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ImportPage />} />
        <Route path="/records" element={<RecordList />} />
        <Route path="/records/:id" element={<RecordDetail />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
