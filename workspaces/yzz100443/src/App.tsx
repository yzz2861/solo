import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ElderlyLogin from "@/pages/elderly/ElderlyLogin";
import ElderlyHome from "@/pages/elderly/ElderlyHome";
import GamePage from "@/pages/elderly/GamePage";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import CaseManagement from "@/pages/admin/CaseManagement";
import CaseEditor from "@/pages/admin/CaseEditor";
import Analytics from "@/pages/admin/Analytics";
import ElderlyManagement from "@/pages/admin/ElderlyManagement";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route path="/elderly/login" element={<ElderlyLogin />} />
        <Route path="/elderly/home" element={<ElderlyHome />} />
        <Route path="/elderly/game" element={<GamePage />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cases" element={<CaseManagement />} />
          <Route path="cases/new" element={<CaseEditor />} />
          <Route path="cases/:id/edit" element={<CaseEditor />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="elderly" element={<ElderlyManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}
