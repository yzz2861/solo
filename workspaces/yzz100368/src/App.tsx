import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Upload from '@/pages/Upload';
import RecordList from '@/pages/RecordList';
import Extract from '@/pages/Extract';
import Confirm from '@/pages/Confirm';
import QA from '@/pages/QA';
import History from '@/pages/History';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="records" element={<RecordList />} />
          <Route path="qa" element={<QA />} />
        </Route>
        <Route path="/record/:id/extract" element={<Extract />} />
        <Route path="/record/:id/confirm" element={<Confirm />} />
        <Route path="/record/:id/history" element={<History />} />
      </Routes>
    </Router>
  );
}
