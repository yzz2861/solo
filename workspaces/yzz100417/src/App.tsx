import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Register from '@/pages/Register';
import PatientDetail from '@/pages/PatientDetail';
import Inventory from '@/pages/Inventory';
import Reports from '@/pages/Reports';
import Tomorrow from '@/pages/Tomorrow';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/tomorrow" element={<Tomorrow />} />
          <Route path="/patient/:id" element={<PatientDetail />} />
          <Route
            path="*"
            element={
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">404</h1>
                <p className="text-slate-500">页面不存在</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}
