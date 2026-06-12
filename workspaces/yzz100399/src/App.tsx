import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Schemes from "@/pages/Schemes";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schemes" element={<Schemes />} />
      </Routes>
    </Router>
  );
}
