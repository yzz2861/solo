import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import BookingPage from './pages/BookingPage';
import GatePage from './pages/GatePage';
import StatsPage from './pages/StatsPage';
import HandoverPage from './pages/HandoverPage';

export default function App() {
  const initData = useStore((state) => state.initData);
  const currentUser = useStore((state) => state.currentUser);

  useEffect(() => {
    initData();
    
    const interval = setInterval(() => {
      useStore.getState().updateOverdueStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [initData]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/gate" element={<GatePage />} />
          {currentUser?.role === 'reception' && (
            <Route path="/stats" element={<StatsPage />} />
          )}
          {currentUser?.role === 'security' && (
            <Route path="/handover" element={<HandoverPage />} />
          )}
        </Routes>
      </Layout>
    </Router>
  );
}
