import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import EventDetail from "@/pages/EventDetail";
import Review from "@/pages/Review";
import Reveal from "@/pages/Reveal";
import Export from "@/pages/Export";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/event/:id/review" element={<Review />} />
          <Route path="/event/:id/reveal" element={<Reveal />} />
          <Route path="/event/:id/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
