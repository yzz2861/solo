import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import QueuePage from './pages/QueuePage';
import StatsPage from './pages/StatsPage';
import DoctorManagePage from './pages/DoctorManagePage';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { key: '/', label: '🏥 挂号登记' },
    { key: '/queue', label: '📢 叫号台' },
    { key: '/doctors', label: '👨‍⚕️ 医生排班' },
    { key: '/stats', label: '📊 院长报表' },
  ];

  const activeKey = tabs.find((t) => {
    if (t.key === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname.startsWith(t.key);
  })?.key;

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="header-title">小诊所叫号桌面台</div>
          <div className="header-sub">
            {currentTime.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}{' '}
            {currentTime.toLocaleTimeString('zh-CN')}
          </div>
        </div>
        <div className="nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`nav-btn ${activeKey === t.key ? 'active' : ''}`}
              onClick={() => navigate(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="content">
        <Routes>
          <Route path="/" element={<RegistrationPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/doctors" element={<DoctorManagePage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </div>
    </div>
  );
}
