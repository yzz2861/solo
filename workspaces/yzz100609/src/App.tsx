import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InputPage from "@/pages/InputPage";
import ResultPage from "@/pages/ResultPage";
import SimulationPage from "@/pages/SimulationPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Routes>
          <Route path="/" element={<InputPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </div>
    </Router>
  );
}
