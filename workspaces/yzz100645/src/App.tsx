import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Toast from "@/components/Toast";
import { useUIStore } from "@/stores/uiStore";
import Dashboard from "@/pages/Dashboard";
import EmailImport from "@/pages/EmailImport";
import CommitmentPending from "@/pages/CommitmentPending";
import CommitmentDetail from "@/pages/CommitmentDetail";
import OrderLink from "@/pages/OrderLink";
import CommitmentExport from "@/pages/CommitmentExport";

function LayoutContent() {
  const location = useLocation();
  const setActiveRoute = useUIStore((s) => s.setActiveRoute);

  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location.pathname, setActiveRoute]);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/email/import" element={<EmailImport />} />
                <Route
                  path="/commitments/pending"
                  element={<CommitmentPending />}
                />
                <Route
                  path="/commitment/:id"
                  element={<CommitmentDetail />}
                />
                <Route path="/orders/link" element={<OrderLink />} />
                <Route
                  path="/commitments/export"
                  element={<CommitmentExport />}
                />
                <Route
                  path="*"
                  element={
                    <div className="h-full flex flex-col items-center justify-center py-32 text-center px-4">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-steel-100 to-amber-50 flex items-center justify-center mb-5 shadow-inner">
                        <span className="text-3xl font-serif font-bold text-steel-400">
                          404
                        </span>
                      </div>
                      <h2 className="font-serif text-xl font-semibold text-steel-800 mb-1">
                        页面不存在
                      </h2>
                      <p className="text-sm text-steel-500 mb-6 max-w-sm">
                        您访问的页面路径无效，请从左侧导航选择功能模块
                      </p>
                    </div>
                  }
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <LayoutContent />
    </Router>
  );
}
