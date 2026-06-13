import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './AppLayout';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Courses from './pages/Courses';
import Dispensing from './pages/Dispensing';
import Inventory from './pages/Inventory';
import CostReport from './pages/CostReport';
import Consumption from './pages/Consumption';
import PrepList from './pages/PrepList';
import Procurement from './pages/Procurement';

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#722ed1' } }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="materials" element={<Materials />} />
            <Route path="courses" element={<Courses />} />
            <Route path="dispensing" element={<Dispensing />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="cost" element={<CostReport />} />
            <Route path="consumption" element={<Consumption />} />
            <Route path="prep" element={<PrepList />} />
            <Route path="procurement" element={<Procurement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ConfigProvider>
  );
}
