import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import PracticePage from '@/pages/PracticePage';
import ResultPage from '@/pages/ResultPage';
import ParentPage from '@/pages/ParentPage';
import DoctorPage from '@/pages/DoctorPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/parent" element={<ParentPage />} />
        <Route path="/doctor" element={<DoctorPage />} />
      </Routes>
    </Router>
  );
}
