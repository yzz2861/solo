import { BrowserRouter as Router, Routes, Route, useParams, Outlet } from 'react-router-dom'
import Layout from '@/components/shared/Layout'
import CalendarPage from '@/pages/CalendarPage'
import BookingPage from '@/pages/BookingPage'
import GroomerPage from '@/pages/GroomerPage'
import ManagerPage from '@/pages/ManagerPage'
import RoutePage from '@/pages/RoutePage'
import HandoverCard from '@/components/print/HandoverCard'

function HandoverCardWrapper() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  if (!appointmentId) return null
  return <HandoverCard appointmentId={appointmentId} />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/booking/new" element={<BookingPage />} />
          <Route path="/booking/:id" element={<BookingPage />} />
          <Route path="/groomer" element={<GroomerPage />} />
          <Route path="/manager" element={<ManagerPage />} />
          <Route path="/route" element={<RoutePage />} />
        </Route>
        <Route path="/handover/:appointmentId" element={<HandoverCardWrapper />} />
      </Routes>
    </Router>
  )
}
