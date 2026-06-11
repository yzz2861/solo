import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MaterialImport from './pages/MaterialImport';
import Analyze from './pages/Analyze';
import Summary from './pages/Summary';
import Export from './pages/Export';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:projectId" element={<Layout />}>
          <Route index element={<Navigate to="import" replace />} />
          <Route path="import" element={<MaterialImport />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="summary" element={<Summary />} />
          <Route path="export" element={<Export />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
