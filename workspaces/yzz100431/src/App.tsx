import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import DataEntry from "@/pages/DataEntry";
import ReviewPage from "@/pages/ReviewPage";
import RecordsPage from "@/pages/RecordsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DataEntry />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/records" element={<RecordsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
