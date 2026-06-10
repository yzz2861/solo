import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import CheckoutPage from './pages/CheckoutPage';
import WorkersPage from './pages/WorkersPage';
import ReportPage from './pages/ReportPage';
import MembersPage from './pages/MembersPage';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<CheckoutPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/members" element={<MembersPage />} />
          </Routes>
        </main>
        <ToastContainer />
      </div>
    </Router>
  );
}
