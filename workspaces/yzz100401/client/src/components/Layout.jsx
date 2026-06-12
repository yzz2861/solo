import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Typography } from 'antd';
import { 
  FileTextOutlined, 
  UploadOutlined, 
  AuditOutlined,
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isSupervisor } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = isSupervisor() ? [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '数据概览',
      onClick: () => navigate('/')
    },
    {
      key: '/claims',
      icon: <FileTextOutlined />,
      label: '理赔案件',
      onClick: () => navigate('/claims')
    },
    {
      key: '/revisions',
      icon: <AuditOutlined />,
      label: '改判审核',
      onClick: () => navigate('/revisions')
    }
  ] : [
    {
      key: '/claims',
      icon: <FileTextOutlined />,
      label: '理赔案件',
      onClick: () => navigate('/claims')
    }
  ];

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: (
          <div>
            <div>{user?.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {user?.role === 'supervisor' ? '理赔主管' : '理赔员'}
            </div>
          </div>
        ),
        disabled: true
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout
      }
    ]
  };

  return (
    <AntLayout className="app-container">
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <AuditOutlined style={{ fontSize: 24, color: '#fff', marginRight: 12 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            理赔材料摘要核对系统
          </Title>
        </div>
        
        <Dropdown menu={userMenu} placement="bottomRight">
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Avatar style={{ backgroundColor: '#1890ff', marginRight: 8 }}>
              {user?.name?.charAt(0)}
            </Avatar>
            <span style={{ color: '#fff' }}>{user?.name}</span>
          </div>
        </Dropdown>
      </Header>
      
      <AntLayout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        
        <Content className="main-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
