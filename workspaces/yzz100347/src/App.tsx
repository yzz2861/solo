import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import InputPage from "@/pages/InputPage";
import VerifyPage from "@/pages/VerifyPage";
import BroadcastPage from "@/pages/BroadcastPage";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/input" replace />} />
          <Route path="/input" element={<InputPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/broadcast" element={<BroadcastPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
