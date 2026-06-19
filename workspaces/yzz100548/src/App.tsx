import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Students from "@/pages/Students";
import Groups from "@/pages/Groups";
import Export from "@/pages/Export";
import Followup from "@/pages/Followup";
import GradeView from "@/pages/GradeView";
import Layout from "@/components/Layout";
import { useAppStore } from "@/store/useAppStore";

function ProtectedRoute({ children, requireRole }: { children: React.ReactNode; requireRole?: "班主任" | "年级组长" }) {
  const { currentRole } = useAppStore();
  
  if (requireRole && currentRole !== requireRole) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/students" element={
          <ProtectedRoute>
            <Students />
          </ProtectedRoute>
        } />
        <Route path="/groups" element={
          <ProtectedRoute>
            <Groups />
          </ProtectedRoute>
        } />
        <Route path="/export" element={
          <ProtectedRoute>
            <Export />
          </ProtectedRoute>
        } />
        <Route path="/followup" element={
          <ProtectedRoute>
            <Followup />
          </ProtectedRoute>
        } />
        <Route path="/grade-view" element={
          <ProtectedRoute requireRole="年级组长">
            <GradeView />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
