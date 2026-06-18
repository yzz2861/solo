import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Workspace from "@/pages/Workspace";
import Alerts from "@/pages/Alerts";
import Export from "@/pages/Export";
import Review from "@/pages/Review";
import ExpertReview from "@/pages/ExpertReview";
import { useStore } from "@/store";

function DemoLoader() {
  const project = useStore((s) => s.project);
  const generateAlerts = useStore((s) => s.generateAlerts);

  useEffect(() => {
    if (!project) {
      import("@/data/demo").then(({ DEMO_PROJECT, DEMO_COMPONENTS, DEMO_ANNOTATIONS, DEMO_PHOTOS, DEMO_MEASUREMENTS, DEMO_DISEASES, DEMO_REPAIR_SUGGESTIONS, DEMO_REINSPECTIONS, DEMO_VIEWPOINTS, DEMO_REVIEW_TASKS, DEMO_REVIEW_ITEMS, DEMO_EXPERT_OPINIONS }) => {
        useStore.setState({
          project: DEMO_PROJECT,
          components: DEMO_COMPONENTS,
          annotations: DEMO_ANNOTATIONS,
          photos: DEMO_PHOTOS,
          measurements: DEMO_MEASUREMENTS,
          diseases: DEMO_DISEASES,
          repairSuggestions: DEMO_REPAIR_SUGGESTIONS,
          reinspections: DEMO_REINSPECTIONS,
          viewpoints: DEMO_VIEWPOINTS,
          reviewTasks: DEMO_REVIEW_TASKS,
          reviewItems: DEMO_REVIEW_ITEMS,
          expertOpinions: DEMO_EXPERT_OPINIONS,
        });
        generateAlerts();
      });
    }
  }, [project, generateAlerts]);

  return null;
}

export default function App() {
  return (
    <Router>
      <DemoLoader />
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/export" element={<Export />} />
        <Route path="/review" element={<Review />} />
        <Route path="/expert" element={<ExpertReview />} />
      </Routes>
    </Router>
  );
}
