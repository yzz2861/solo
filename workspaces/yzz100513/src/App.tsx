import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProjectList } from '@/pages/ProjectList'
import { ImportPage } from '@/pages/ImportPage'
import { EditorPage } from '@/pages/EditorPage'
import { ExportPage } from '@/pages/ExportPage'

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-paper">
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="/export/:id" element={<ExportPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
