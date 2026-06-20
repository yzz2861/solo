import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";
import History from "@/pages/History";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}
