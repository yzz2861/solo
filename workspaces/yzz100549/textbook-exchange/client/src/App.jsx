import { Routes, Route, NavLink, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import BookDetail from './pages/BookDetail.jsx'
import RegisterBook from './pages/RegisterBook.jsx'
import MyOrders from './pages/MyOrders.jsx'
import Admin from './pages/Admin.jsx'
import Settlement from './pages/Settlement.jsx'

function App() {
  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>📚 二手教材置换台</h1>
          <nav className="nav">
            <NavLink to="/" end>教材列表</NavLink>
            <NavLink to="/register">登记教材</NavLink>
            <NavLink to="/orders">我的预订</NavLink>
            <NavLink to="/admin">后台管理</NavLink>
            <NavLink to="/settlement">结算对账</NavLink>
          </nav>
        </div>
      </div>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/register" element={<RegisterBook />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settlement" element={<Settlement />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
