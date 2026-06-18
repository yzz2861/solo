import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EstimateInput from "@/pages/EstimateInput";
import EstimateResult from "@/pages/EstimateResult";
import Feedback from "@/pages/Feedback";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EstimateInput />} />
        <Route path="/result" element={<EstimateResult />} />
        <Route path="/feedback" element={<Feedback />} />
      </Routes>
    </Router>
  );
}
