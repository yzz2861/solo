import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Layout/Navbar";
import Home from "@/pages/Home";
import Reports from "@/pages/Reports";
import Comparison from "@/pages/Comparison";
import { useSceneStore } from "@/store/useSceneStore";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { getAllTargetIds } from "@/services/dataService";

export default function App() {
  const { patrolShifts, checkpoints, forbiddenZones, actions: sceneActions } = useSceneStore();
  const { actions: annotationActions } = useAnnotationStore();

  useEffect(() => {
    sceneActions.loadData();
  }, []);

  useEffect(() => {
    annotationActions.loadAnnotations();
  }, []);

  useEffect(() => {
    if (patrolShifts.length > 0) {
      const validIds = getAllTargetIds(patrolShifts, checkpoints, forbiddenZones);
      annotationActions.validateAnnotations(validIds);
    }
  }, [patrolShifts, checkpoints, forbiddenZones]);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/comparison" element={<Comparison />} />
        </Routes>
      </div>
    </Router>
  );
}
