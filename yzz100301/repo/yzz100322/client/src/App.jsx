import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  TableOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import ImportPage from './pages/ImportPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/import', icon: <UploadOutlined />, label: '数据导入' },
  { key: '/records', icon: <TableOutlined />, label: '访客记录' },
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = location.pathname === '/' ? '/dashboard' : location.pathname;

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <FileTextOutlined style={{ fontSize: '24px' }} />
          <span>园区访客车辆放行审计系统</span>
        </div>
        <div style={{ color: '#666', fontSize: '13px' }}>
          安保主管 · 审计管理
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/records" element={<RecordsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
