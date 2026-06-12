import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SceneHome from "@/pages/SceneHome";
import PlanList from "@/pages/PlanList";
import LiftReview from "@/pages/LiftReview";
import HandoverPage from "@/pages/HandoverPage";
import PlanPreview from "@/pages/PlanPreview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SceneHome />} />
        <Route path="/plans" element={<PlanList />} />
        <Route path="/lifts/:planId" element={<LiftReview />} />
        <Route path="/handover/:planId" element={<HandoverPage />} />
        <Route path="/preview/:planId" element={<PlanPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
