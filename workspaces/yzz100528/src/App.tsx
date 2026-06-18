import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Register from "@/pages/Register"
import Orders from "@/pages/Orders"
import OrderDetail from "@/pages/OrderDetail"
import Recycling from "@/pages/Recycling"
import Finance from "@/pages/Finance"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:id" element={<Register />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/recycling" element={<Recycling />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  )
}
