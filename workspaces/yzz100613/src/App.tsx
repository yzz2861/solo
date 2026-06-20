import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import Calculator from "@/pages/Calculator";
import BatchAnalysis from "@/pages/BatchAnalysis";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Calculator />} />
            <Route path="/batch" element={<BatchAnalysis />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
