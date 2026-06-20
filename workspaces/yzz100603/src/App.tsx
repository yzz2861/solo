import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import CalculatorPage from '@/pages/CalculatorPage';
import RecordsPage from '@/pages/RecordsPage';
import AuditPage from '@/pages/AuditPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/calculator" replace />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
