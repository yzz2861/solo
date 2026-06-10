import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/common/Layout"
import HomePage from "@/pages/HomePage"
import GamePage from "@/pages/GamePage"
import EditorPage from "@/pages/EditorPage"
import ReplayPage from "@/pages/ReplayPage"
import ScoresPage from "@/pages/ScoresPage"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/editor/:levelId" element={<EditorPage />} />
          <Route path="/replay/:recordId" element={<ReplayPage />} />
          <Route path="/scores" element={<ScoresPage />} />
        </Route>
        <Route path="/game/:levelId" element={<GamePage />} />
      </Routes>
    </Router>
  )
}
