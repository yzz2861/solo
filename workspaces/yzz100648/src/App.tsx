import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Projects from '@/pages/Projects';
import Import from '@/pages/Import';
import Mining from '@/pages/Mining';
import RiskManagement from '@/pages/RiskManagement';
import Export from '@/pages/Export';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id/import" element={<Import />} />
          <Route path="/projects/:id/mining" element={<Mining />} />
          <Route path="/projects/:id/risks" element={<RiskManagement />} />
          <Route path="/projects/:id/export" element={<Export />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
