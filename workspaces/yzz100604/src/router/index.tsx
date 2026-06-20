import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import SingleEvaluate from '@/pages/SingleEvaluate';
import BatchDispatch from '@/pages/BatchDispatch';
import SaltArchive from '@/pages/SaltArchive';
import ThresholdDocs from '@/pages/ThresholdDocs';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<SingleEvaluate />} />
          <Route path="/batch" element={<BatchDispatch />} />
          <Route path="/archive" element={<SaltArchive />} />
          <Route path="/thresholds" element={<ThresholdDocs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
