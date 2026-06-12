import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Board from '@/pages/Board';
import Register from '@/pages/Register';
import CageCheck from '@/pages/CageCheck';
import Handover from '@/pages/Handover';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/board" element={<Board />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:id" element={<Register />} />
          <Route path="/cage-check" element={<CageCheck />} />
          <Route path="/handover" element={<Handover />} />
        </Route>
      </Routes>
    </Router>
  );
}
