import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import DataManagement from "@/pages/DataManagement";
import AnomalyAnalysis from "@/pages/AnomalyAnalysis";
import ReportExport from "@/pages/ReportExport";
import HistoryReview from "@/pages/HistoryReview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<DataManagement />} />
          <Route path="/anomaly" element={<AnomalyAnalysis />} />
          <Route path="/reports" element={<ReportExport />} />
          <Route path="/history" element={<HistoryReview />} />
        </Route>
      </Routes>
    </Router>
  );
}
