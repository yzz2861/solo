import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Student from '@/pages/Student';
import Reception from '@/pages/Reception';
import Manager from '@/pages/Manager';
import Owner from '@/pages/Owner';
import { AppHeader } from '@/components/AppHeader';
import { ToastStack } from '@/components/ToastStack';
import { StoreInitializer } from '@/components/StoreInitializer';

export default function App() {
  return (
    <Router>
      <StoreInitializer />
      <div className="min-h-screen bg-ink-50/40">
        <AppHeader />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/student" element={<Student />} />
          <Route path="/reception" element={<Reception />} />
          <Route path="/manager" element={<Manager />} />
          <Route path="/owner" element={<Owner />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <ToastStack />
      </div>
    </Router>
  );
}
