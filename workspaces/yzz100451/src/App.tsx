import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import FeedbackForm from '@/pages/FeedbackForm'
import GroupedView from '@/pages/GroupedView'
import ExportPage from '@/pages/ExportPage'
import AnalyticsPage from '@/pages/AnalyticsPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<FeedbackForm />} />
          <Route path="/grouped" element={<GroupedView />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
