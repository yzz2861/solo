import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import Home from "@/pages/Home";
import DataImport from "@/pages/DataImport";
import BatchList from "@/pages/BatchList";
import BatchDetail from "@/pages/BatchDetail";
import RiskReport from "@/pages/RiskReport";
import KnowledgeBase from "@/pages/KnowledgeBase";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-amber-50/50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/import" element={<DataImport />} />
            <Route path="/batches" element={<BatchList />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            <Route path="/report" element={<RiskReport />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
