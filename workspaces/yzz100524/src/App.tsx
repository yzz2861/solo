import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import Dashboard from '@/pages/Dashboard';
import Register from '@/pages/Register';
import ReturnCheck from '@/pages/ReturnCheck';
import Vehicles from '@/pages/Vehicles';
import Customers from '@/pages/Customers';
import Reports from '@/pages/Reports';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/return/:id" element={<ReturnCheck />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<Customers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
      <Toast />
    </Router>
  );
}
