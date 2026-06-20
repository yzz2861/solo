import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Calculator from "@/pages/Calculator";
import Records from "@/pages/Records";
import Presets from "@/pages/Presets";
import { useEffect } from "react";
import { useDilutionStore } from "@/store/useDilutionStore";

export default function App() {
  const loadFromStorage = useDilutionStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/records" element={<Records />} />
          <Route path="/presets" element={<Presets />} />
        </Routes>
      </div>
    </Router>
  );
}
