import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WorkbenchPage from '@/pages/WorkbenchPage';
import HistoryPage from '@/pages/HistoryPage';
import { useComplaintStore } from '@/store/complaintStore';

export default function App() {
  const initStore = useComplaintStore((s) => s.initStore);

  useEffect(() => {
    initStore();
  }, [initStore]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkbenchPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
