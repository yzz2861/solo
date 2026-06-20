import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calculator as CalcIcon, Archive } from 'lucide-react';
import Calculator from '@/pages/Calculator';
import History from '@/pages/History';
import { cn } from '@/lib/utils';

function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '排湿估算', icon: CalcIcon },
    { path: '/history', label: '经验档案', icon: Archive },
  ];

  return (
    <nav className="bg-white/70 backdrop-blur-md border-b border-warm-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <CalcIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-warm-800">烘干估算</span>
          </Link>

          <div className="flex items-center gap-1 bg-warm-100 rounded-xl p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-warm-600 hover:text-warm-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  );
}
