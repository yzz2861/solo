import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/ui/Navbar';
import Index from './pages/Index';
import Export from './pages/Export';
import Approval from './pages/Approval';
import Dismantle from './pages/Dismantle';

export default function App() {
  return (
    <Router>
      <div className="flex flex-col h-screen bg-slate-950">
        <Navbar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/export" element={<Export />} />
            <Route path="/approval" element={<Approval />} />
            <Route path="/dismantle" element={<Dismantle />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
