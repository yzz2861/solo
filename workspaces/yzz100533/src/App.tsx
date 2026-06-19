import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Garden from "@/pages/Garden";
import PlantCare from "@/pages/PlantCare";
import Teacher from "@/pages/Teacher";
import Report from "@/pages/Report";
import Guide from "@/pages/Guide";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Garden />} />
          <Route path="/plant/:plantId" element={<PlantCare />} />
          <Route path="/teacher" element={<Teacher />} />
          <Route path="/report" element={<Report />} />
          <Route path="/guide" element={<Guide />} />
        </Routes>
      </Layout>
    </Router>
  );
}
