import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/pages/Layout";
import ReviewPage from "@/pages/ReviewPage";
import ComparePage from "@/pages/ComparePage";
import MarksPage from "@/pages/MarksPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/review" replace />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="marks" element={<MarksPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
