import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "@/components/NavBar";
import KitchenDashboard from "@/pages/KitchenDashboard";
import DataEntry from "@/pages/DataEntry";
import ManagerReport from "@/pages/ManagerReport";
import WeeklyAnalysis from "@/pages/WeeklyAnalysis";
import ProcurementPage from "@/pages/ProcurementPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-surface-950 text-slate-200">
        <div
          className="fixed inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 115, 22, 0.08), transparent),
              radial-gradient(ellipse 60% 40% at 80% 120%, rgba(59, 130, 246, 0.06), transparent)
            `,
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <NavBar />
          <Routes>
            <Route path="/" element={<KitchenDashboard />} />
            <Route path="/entry" element={<DataEntry />} />
            <Route path="/report" element={<ManagerReport />} />
            <Route path="/analysis" element={<WeeklyAnalysis />} />
            <Route path="/procurement" element={<ProcurementPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
