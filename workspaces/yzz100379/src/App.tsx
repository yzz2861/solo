import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Login from '@/pages/Login'
import CSLayout from '@/components/Layout/CSLayout'
import TechLayout from '@/components/Layout/TechLayout'
import Workbench from '@/pages/cs/Workbench'
import TicketList from '@/pages/cs/TicketList'
import TicketDetail from '@/pages/cs/TicketDetail'
import ExportCenter from '@/pages/admin/ExportCenter'
import TechTicketList from '@/pages/tech/TechTicketList'
import TechTicketDetail from '@/pages/tech/TechTicketDetail'
import { useAuthStore } from '@/store/authStore'
import type { StaffRole } from '@/shared/types'

function RequireAuth({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: StaffRole[]
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userRole = useAuthStore((s) => s.userRole)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    if (userRole === 'tech') {
      return <Navigate to="/tech/my-tickets" replace />
    }
    return <Navigate to="/cs/workbench" replace />
  }

  return <>{children}</>
}

function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userRole = useAuthStore((s) => s.userRole)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (userRole === 'tech') {
    return <Navigate to="/tech/my-tickets" replace />
  }

  return <Navigate to="/cs/workbench" replace />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth allowedRoles={['cs', 'admin']}>
              <CSLayout />
            </RequireAuth>
          }
        >
          <Route
            path="/cs/workbench"
            element={
              <RequireAuth allowedRoles={['cs']}>
                <Workbench />
              </RequireAuth>
            }
          />
          <Route
            path="/cs/tickets"
            element={
              <RequireAuth allowedRoles={['cs', 'admin']}>
                <TicketList />
              </RequireAuth>
            }
          />
          <Route
            path="/cs/tickets/:id"
            element={
              <RequireAuth allowedRoles={['cs', 'admin']}>
                <TicketDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/export"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ExportCenter />
              </RequireAuth>
            }
          />
        </Route>

        <Route
          path="/tech/my-tickets"
          element={
            <RequireAuth allowedRoles={['tech']}>
              <TechLayout title="我的派单" showTabs>
                <TechTicketList />
              </TechLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/tech/my-tickets/:id"
          element={
            <RequireAuth allowedRoles={['tech']}>
              <TechLayout title="派单详情" showBack>
                <TechTicketDetail />
              </TechLayout>
            </RequireAuth>
          }
        />

        <Route
          path="*"
          element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center p-8">
                <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
                <p className="text-slate-600 mb-6">页面不存在</p>
                <Navigate to="/" replace />
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  )
}
