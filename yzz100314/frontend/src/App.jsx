import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import ImportPage from './pages/ImportPage.jsx'
import TicketList from './pages/TicketList.jsx'
import TicketDetail from './pages/TicketDetail.jsx'
import ReportsPage from './pages/ReportsPage.jsx'

function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>SLA审计系统</h2>
          <p>客服工单月底复盘</p>
        </div>
        <ul className="nav-menu">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              📊 数据概览
            </NavLink>
          </li>
          <li>
            <NavLink to="/import" className={({ isActive }) => isActive ? 'active' : ''}>
              📥 数据导入
            </NavLink>
          </li>
          <li>
            <NavLink to="/tickets" className={({ isActive }) => isActive ? 'active' : ''}>
              📋 工单列表
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
              📑 审计报告
            </NavLink>
          </li>
        </ul>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/:ticketNo" element={<TicketDetail />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
