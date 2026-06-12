import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout/Layout";
import OrderList from "@/pages/OrderList/OrderList";
import PhotoScreening from "@/pages/PhotoScreening/PhotoScreening";
import CustomerReview from "@/pages/CustomerReview/CustomerReview";
import QualityDesk from "@/pages/QualityDesk/QualityDesk";
import ReportExport from "@/pages/ReportExport/ReportExport";
import { useOrderStore } from "@/store/useOrderStore";

function AppContent() {
  const { initMockData, orders } = useOrderStore();

  useEffect(() => {
    if (orders.length === 0) {
      initMockData();
    }
  }, [initMockData, orders.length]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OrderList />} />
        <Route path="/screening/:id" element={<PhotoScreening />} />
        <Route path="/review/:id" element={<CustomerReview />} />
        <Route path="/quality" element={<QualityDesk />} />
        <Route path="/report" element={<ReportExport />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
