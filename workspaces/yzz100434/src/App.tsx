import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Checklist from '@/pages/Checklist'
import Files from '@/pages/Files'
import Export from '@/pages/Export'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/files" element={<Files />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  )
}
