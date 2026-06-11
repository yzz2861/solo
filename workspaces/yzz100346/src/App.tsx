import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EditorPage from "@/pages/EditorPage";
import ProjectListPage from "@/pages/ProjectListPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/export/:id" element={<ExportPage />} />
        <Route path="*" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}
