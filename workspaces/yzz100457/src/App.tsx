import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import GamePage from "@/pages/GamePage";
import ResultPage from "@/pages/ResultPage";
import EditorPage from "@/pages/EditorPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:levelId" element={<GamePage />} />
        <Route path="/result/:levelId" element={<ResultPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:levelId" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}
