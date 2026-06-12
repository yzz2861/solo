import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import PhotoImport from '@/pages/PhotoImport'
import RecognitionResults from '@/pages/RecognitionResults'
import ReviewConfirm from '@/pages/ReviewConfirm'
import InspectionReports from '@/pages/InspectionReports'
import ReportDetail from '@/pages/ReportDetail'
import RectificationList from '@/pages/RectificationList'
import RecheckCompare from '@/pages/RecheckCompare'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/import" replace />} />
          <Route path="import" element={<PhotoImport />} />
          <Route path="results" element={<RecognitionResults />} />
          <Route path="review/current" element={<ReviewConfirm />} />
          <Route path="review/:photoId" element={<ReviewConfirm />} />
          <Route path="reports" element={<InspectionReports />} />
          <Route path="reports/:reportId" element={<ReportDetail />} />
          <Route path="rectification" element={<RectificationList />} />
          <Route path="recheck" element={<RecheckCompare />} />
        </Route>
      </Routes>
    </Router>
  )
}
