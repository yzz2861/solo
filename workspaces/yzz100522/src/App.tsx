import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import HomePage from "@/pages/HomePage";
import TrainingPage from "@/pages/TrainingPage";
import ResultPage from "@/pages/ResultPage";
import AdminDashboard from "@/pages/AdminDashboard";
import CaseEditorPage from "@/pages/CaseEditorPage";
import { useUserStore } from './stores';

function App() {
  const { loadUser } = useUserStore();
  
  useEffect(() => {
    loadUser();
  }, []);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/result/:id" element={<ResultPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/case/new" element={<CaseEditorPage />} />
        <Route path="/admin/case/:id/edit" element={<CaseEditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
