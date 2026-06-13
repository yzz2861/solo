import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import Export from "@/pages/Export";
import Construction from "@/pages/Construction";
import Inspection from "@/pages/Inspection";
import { useSignageStore } from "@/store/signageStore";
import { useEffect } from "react";

function AppInner() {
  const init = useSignageStore((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/editor/:schemeId" element={<Editor />} />
      <Route path="/export/:schemeId" element={<Export />} />
      <Route path="/construction/:schemeId" element={<Construction />} />
      <Route path="/inspection/:schemeId" element={<Inspection />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
