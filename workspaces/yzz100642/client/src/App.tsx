import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ChatImport from './pages/ChatImport';
import CommitmentsList from './pages/CommitmentsList';
import CommitmentDetail from './pages/CommitmentDetail';
import Approvals from './pages/Approvals';
import CustomerSummary from './pages/CustomerSummary';
import OpportunitySummary from './pages/OpportunitySummary';
import Delivery from './pages/Delivery';

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<ChatImport />} />
            <Route path="/commitments" element={<CommitmentsList />} />
            <Route path="/commitments/:id" element={<CommitmentDetail />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/summary/customers" element={<CustomerSummary />} />
            <Route path="/summary/opportunities" element={<OpportunitySummary />} />
            <Route path="/delivery" element={<Delivery />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
