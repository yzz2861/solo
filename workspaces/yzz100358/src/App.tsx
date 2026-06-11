import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Bookings from '@/pages/Bookings';
import Gallery from '@/pages/Gallery';
import TodayView from '@/pages/TodayView';
import Export from '@/pages/Export';
import Settings from '@/pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'clients', element: <Clients /> },
      { path: 'bookings', element: <Bookings /> },
      { path: 'gallery', element: <Gallery /> },
      { path: 'today', element: <TodayView /> },
      { path: 'export', element: <Export /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export default router;
