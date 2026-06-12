import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ImportPage from "@/pages/ImportPage";
import DashboardPage from "@/pages/DashboardPage";
import ChurnListPage from "@/pages/ChurnListPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/import" replace />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="churn-list" element={<ChurnListPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
