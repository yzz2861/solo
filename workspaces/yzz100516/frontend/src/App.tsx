import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SampleList from './pages/SampleList';
import SampleDetail from './pages/SampleDetail';
import OverdueSamples from './pages/OverdueSamples';
import Compliance from './pages/Compliance';

const { Header, Sider, Content } = Layout;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '首页概览',
    },
    {
      key: '/samples',
      icon: <UnorderedListOutlined />,
      label: '样品管理',
    },
    {
      key: '/overdue',
      icon: <ExclamationCircleOutlined />,
      label: '超期追踪',
    },
    {
      key: '/compliance',
      icon: <FileSearchOutlined />,
      label: '合规管理',
    },
  ];

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/samples/')) return '/samples';
    return location.pathname;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible width={220}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          保税样品管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {menuItems.find((item) => item.key === getSelectedKey())?.label || '保税样品出入审批管理系统'}
          </h2>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/samples" element={<SampleList />} />
            <Route path="/samples/:id" element={<SampleDetail />} />
            <Route path="/overdue" element={<OverdueSamples />} />
            <Route path="/compliance" element={<Compliance />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
