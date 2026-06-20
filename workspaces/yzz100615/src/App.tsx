import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import LoadingTeam from '@/pages/LoadingTeam';
import Dispatcher from '@/pages/Dispatcher';
import Driver from '@/pages/Driver';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/loading" element={<LoadingTeam />} />
        <Route path="/dispatcher" element={<Dispatcher />} />
        <Route path="/driver/:taskId" element={<Driver />} />
      </Routes>
    </Router>
  );
}
