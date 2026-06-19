import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Button, Badge, Space } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  FileProtectOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  FileTextOutlined,
  TeamOutlined,
  BellOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard.jsx'
import ElderlyManagement from './pages/ElderlyManagement.jsx'
import TicketManagement from './pages/TicketManagement.jsx'
import Purchase from './pages/Purchase.jsx'
import Redeem from './pages/Redeem.jsx'
import CreditManagement from './pages/CreditManagement.jsx'
import DailyReport from './pages/DailyReport.jsx'
import CommunityView from './pages/CommunityView.jsx'
import api from './api.js'

const { Header, Sider, Content } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [alerts, setAlerts] = useState({ expired: 0, overCredit: 0, expiring: 0 })
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const loadAlerts = async () => {
    try {
      const [expired, overCredit, stats] = await Promise.all([
        api.getExpiredSubsidyCount(),
        api.getOverCreditCount(),
        api.getDashboardStats()
      ])
      setAlerts({
        expired,
        overCredit,
        expiring: stats.expiring_subsidy_count || 0
      })
    } catch (e) {
      console.error('加载提醒失败', e)
    }
  }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '首页仪表盘' },
    { key: '/elderly', icon: <UserOutlined />, label: '老人信息管理' },
    { key: '/tickets', icon: <FileProtectOutlined />, label: '票种与补贴' },
    { key: '/purchase', icon: <ShoppingCartOutlined />, label: '购票' },
    { key: '/redeem', icon: <CheckCircleOutlined />, label: '核销与退票' },
    { key: '/credit', icon: <WalletOutlined />, label: '赊账管理' },
    { key: '/report', icon: <FileTextOutlined />, label: '食堂日结' },
    { key: '/community', icon: <TeamOutlined />, label: '居委会视图' }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={220}>
        <div className="logo" style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? 0 : 16,
          background: '#f0f5ff',
          borderBottom: '1px solid #e6f4ff',
          fontSize: collapsed ? 20 : 18,
          fontWeight: 'bold',
          color: '#1677ff'
        }}>
          {collapsed ? '🍚' : '🍚 社区食堂饭票柜'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map(item => {
            if (item.key === '/tickets') {
              return {
                ...item,
                label: (
                  <Space>
                    {item.label}
                    {(alerts.expired > 0 || alerts.expiring > 0) && (
                      <Badge count={alerts.expired + alerts.expiring} size="small" color={alerts.expired > 0 ? '#ff4d4f' : '#faad14'} />
                    )}
                  </Space>
                )
              }
            }
            if (item.key === '/credit') {
              return {
                ...item,
                label: (
                  <Space>
                    {item.label}
                    {alerts.overCredit > 0 && (
                      <Badge count={alerts.overCredit} size="small" color="#ff4d4f" />
                    )}
                  </Space>
                )
              }
            }
            return item
          })}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 16px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Button
            type="text"
            icon={collapsed ? <ReloadOutlined rotate={90} /> : <ReloadOutlined rotate={-90} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Space>
            <Space size="middle">
              {alerts.expired > 0 && (
                <Badge count={alerts.expired} offset={[0, 0]}>
                  <Button size="small" danger icon={<BellOutlined />}>
                    补贴已过期
                  </Button>
                </Badge>
              )}
              {alerts.expiring > 0 && (
                <Badge count={alerts.expiring} offset={[0, 0]} color="#faad14">
                  <Button size="small" type="default" icon={<BellOutlined />}>
                    补贴即将过期
                  </Button>
                </Badge>
              )}
              {alerts.overCredit > 0 && (
                <Badge count={alerts.overCredit} offset={[0, 0]}>
                  <Button size="small" danger icon={<BellOutlined />}>
                    赊账超限
                  </Button>
                </Badge>
              )}
            </Space>
          </Space>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto'
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard onRefresh={loadAlerts} />} />
            <Route path="/elderly" element={<ElderlyManagement />} />
            <Route path="/tickets" element={<TicketManagement onAlertsChange={loadAlerts} />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/redeem" element={<Redeem />} />
            <Route path="/credit" element={<CreditManagement />} />
            <Route path="/report" element={<DailyReport />} />
            <Route path="/community" element={<CommunityView />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
