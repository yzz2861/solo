import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import MainLayout from "@/layouts/MainLayout"
import CalibrationPage from "@/pages/CalibrationPage"
import ArchivePage from "@/pages/ArchivePage"
import ReportPage from "@/pages/ReportPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<CalibrationPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
