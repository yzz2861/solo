import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  ExperimentOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  DollarOutlined,
  BarChartOutlined,
  PrinterOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '总览' },
  { key: '/materials', icon: <ExperimentOutlined />, label: '材料管理' },
  { key: '/courses', icon: <TeamOutlined />, label: '课程与学生' },
  { key: '/dispensing', icon: <ShoppingCartOutlined />, label: '领用登记' },
  { key: '/inventory', icon: <DatabaseOutlined />, label: '库存调整' },
  { key: '/cost', icon: <DollarOutlined />, label: '成本统计' },
  { key: '/consumption', icon: <BarChartOutlined />, label: '消耗分析' },
  { key: '/prep', icon: <PrinterOutlined />, label: '备料单' },
  { key: '/procurement', icon: <ShoppingOutlined />, label: '采购预估' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: '#fff' }}
        width={180}
      >
        <div style={{
          height: 48,
          margin: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: collapsed ? 14 : 16,
          color: '#722ed1',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          {collapsed ? '颜料柜' : '🎨 小画室颜料柜'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Content style={{
          margin: 16,
          padding: 20,
          background: '#fff',
          borderRadius: 8,
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
