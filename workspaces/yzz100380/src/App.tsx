import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import Members from '@/pages/Members';
import Sections from '@/pages/Sections';
import Sheets from '@/pages/Sheets';
import Practice from '@/pages/Practice';
import Attendance from '@/pages/Attendance';
import Performances from '@/pages/Performances';
import ExportPage from '@/pages/Export';
import MemberView from '@/pages/MemberView';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="sections" element={<Sections />} />
          <Route path="sheets" element={<Sheets />} />
          <Route path="practice" element={<Practice />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="performances" element={<Performances />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="member-view" element={<MemberView />} />
        </Route>
      </Routes>
    </Router>
  );
}
