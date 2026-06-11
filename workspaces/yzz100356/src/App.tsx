import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import GamePage from '@/pages/GamePage'
import MistakesPage from '@/pages/MistakesPage'
import VolunteerPage from '@/pages/VolunteerPage'
import BigScreenPage from '@/pages/BigScreenPage'

function App() {
  return (
    <Router>
      <div className="font-rounded antialiased">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/volunteer" element={<VolunteerPage />} />
          <Route path="/volunteer/screen" element={<BigScreenPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
