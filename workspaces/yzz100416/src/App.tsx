import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Workbench } from '@/pages/Workbench';
import { PrintPage } from '@/pages/PrintPage';
import { ExportPage } from '@/pages/ExportPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/print" element={<PrintPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
