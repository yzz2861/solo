import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavigationBar from "@/components/NavigationBar";
import Home from "@/pages/Home";
import Report from "@/pages/Report";
import Archive from "@/pages/Archive";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a1628] bg-[radial-gradient(ellipse_at_top,_#0e2a4a_0%,_#0a1628_60%)]">
        <NavigationBar />
        <main className="mx-auto max-w-7xl px-4 pt-20 pb-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<Report />} />
            <Route path="/archive" element={<Archive />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
