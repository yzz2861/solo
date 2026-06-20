import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ImportPage from './pages/ImportPage';
import WorkspacePage from './pages/WorkspacePage';
import QualityPage from './pages/QualityPage';
import InspectionPage from './pages/InspectionPage';
import ExportPage from './pages/ExportPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/quality" element={<QualityPage />} />
          <Route path="/inspection" element={<InspectionPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
