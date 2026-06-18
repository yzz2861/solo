import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import SessionList from './pages/SessionList'
import NewReview from './pages/NewReview'
import ReviewWorkbench from './pages/ReviewWorkbench'
import Dashboard from './pages/Dashboard'
import ReminderPage from './pages/ReminderPage'
import RecheckPage from './pages/RecheckPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<SessionList />} />
        <Route path="review/new" element={<NewReview />} />
        <Route path="review/:sessionId" element={<ReviewWorkbench />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="reminder/:productLineId" element={<ReminderPage />} />
        <Route path="recheck/:sessionId" element={<RecheckPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
