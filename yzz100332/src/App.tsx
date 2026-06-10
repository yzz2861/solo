import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Workbench from "@/pages/Workbench";
import PrintStation from "@/pages/PrintStation";
import HandoverBoard from "@/pages/HandoverBoard";
import TopNav from "@/components/layout/TopNav";
import OperatorModal from "@/components/layout/OperatorModal";
import ConfirmModal from "@/components/issues/ConfirmModal";
import { useAppStore } from "@/store/useAppStore";

export default function App() {
  const revalidate = useAppStore((s) => s.revalidate);
  const currentOperator = useAppStore((s) => s.currentOperator);
  const confirmFlashKey = useAppStore((s) => s.confirmFlashKey);

  useEffect(() => {
    revalidate();
  }, [revalidate]);

  return (
    <Router>
      <div
        key={confirmFlashKey}
        className={confirmFlashKey ? "animate-flash-green" : ""}
      >
        <div className="min-h-screen flex flex-col bg-brand-500">
          <TopNav />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Workbench />} />
              <Route path="/print" element={<PrintStation />} />
              <Route path="/board" element={<HandoverBoard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        {!currentOperator && <OperatorModal />}
        <ConfirmModal />
      </div>
    </Router>
  );
}
