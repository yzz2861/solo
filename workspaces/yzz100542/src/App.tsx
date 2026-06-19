import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Briefing from '@/pages/Briefing'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/briefing" element={<Briefing />} />
      </Routes>
    </Router>
  )
}
