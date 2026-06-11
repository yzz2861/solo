import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Editor from '@/pages/Editor'
import Schemes from '@/pages/Schemes'
import Compare from '@/pages/Compare'
import Export from '@/pages/Export'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/editor" replace />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/export/:id" element={<Export />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
