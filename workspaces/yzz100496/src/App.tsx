import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import RegistrationForm from "@/pages/RegistrationForm";
import RegistrationList from "@/pages/RegistrationList";
import RegistrationDetail from "@/pages/RegistrationDetail";
import Reminders from "@/pages/Reminders";
import Rooming from "@/pages/Rooming";
import ExportPage from "@/pages/ExportPage";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="registration/new" element={<RegistrationForm />} />
          <Route path="registration/:id/edit" element={<RegistrationForm />} />
          <Route path="registration/:id" element={<RegistrationDetail />} />
          <Route path="registrations" element={<RegistrationList />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="rooming" element={<Rooming />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
