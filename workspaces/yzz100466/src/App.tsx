import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import DataEntry from "@/pages/DataEntry";
import CrackQuery from "@/pages/CrackQuery";
import EngineerReport from "@/pages/EngineerReport";
import ManagementReport from "@/pages/ManagementReport";
import CrackMapping from "@/pages/CrackMapping";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DataEntry />} />
          <Route path="/query" element={<CrackQuery />} />
          <Route path="/engineer" element={<EngineerReport />} />
          <Route path="/management" element={<ManagementReport />} />
          <Route path="/mapping" element={<CrackMapping />} />
        </Route>
      </Routes>
    </Router>
  );
}
