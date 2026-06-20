import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ImportPage from "@/pages/ImportPage";
import ScanPage from "@/pages/ScanPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ImportPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </Router>
  );
}
