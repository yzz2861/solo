import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { ToastProvider } from '@/components/common/Toast';
import Home from '@/pages/Home';
import EditorImport from '@/pages/editor/Import';
import EditorAnnotate from '@/pages/editor/Annotate';
import EditorConfirm from '@/pages/editor/Confirm';
import DoctorImport from '@/pages/doctor/Import';
import DoctorReview from '@/pages/doctor/Review';
import ReviewResult from '@/pages/ReviewResult';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <PageLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor/import" element={<EditorImport />} />
            <Route path="/editor/annotate/:id" element={<EditorAnnotate />} />
            <Route path="/editor/confirm/:id" element={<EditorConfirm />} />
            <Route path="/doctor/import" element={<DoctorImport />} />
            <Route path="/doctor/review/:id" element={<DoctorReview />} />
            <Route path="/review-result/:id" element={<ReviewResult />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageLayout>
      </BrowserRouter>
    </ToastProvider>
  );
}
