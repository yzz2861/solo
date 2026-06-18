import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Scenarios from "@/pages/Scenarios";
import Export from "@/pages/Export";
import Records from "@/pages/Records";
import Drill from "@/pages/Drill";
import { db } from "@/data/db";

export default function App() {
  useEffect(() => {
    db.importMockData().catch(console.error);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/export" element={<Export />} />
        <Route path="/records" element={<Records />} />
        <Route path="/drill" element={<Drill />} />
        <Route path="/drill/:scenarioId" element={<Drill />} />
      </Routes>
    </Router>
  );
}
