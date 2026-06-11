import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";
import Records from "@/pages/Records";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </Router>
  );
}
