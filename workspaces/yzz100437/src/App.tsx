import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import LeaveRecords from "@/pages/LeaveRecords";
import LeaderPanel from "@/pages/LeaderPanel";
import ConductorPanel from "@/pages/ConductorPanel";
import Profile from "@/pages/Profile";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leave" element={<LeaveRecords />} />
          <Route path="/members" element={<Members />} />
          <Route path="/leader" element={<LeaderPanel />} />
          <Route path="/conductor" element={<ConductorPanel />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
