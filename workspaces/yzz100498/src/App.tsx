import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import SalesAnalysis from "@/pages/SalesAnalysis";
import Preparation from "@/pages/Preparation";
import Forecast from "@/pages/Forecast";
import SpecialMeals from "@/pages/SpecialMeals";
import DataImport from "@/pages/DataImport";
import Settings from "@/pages/Settings";
import { useDataStore } from "@/store/useDataStore";
import { useEffect } from "react";

const AppContent: React.FC = () => {
  const { loadMockData, isLoading } = useDataStore();
  
  useEffect(() => {
    loadMockData();
  }, [loadMockData]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">正在加载数据...</h2>
          <p className="text-gray-500">请稍候，系统正在初始化</p>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sales" element={<SalesAnalysis />} />
      <Route path="/preparation" element={<Preparation />} />
      <Route path="/forecast" element={<Forecast />} />
      <Route path="/special-meals" element={<SpecialMeals />} />
      <Route path="/data-import" element={<DataImport />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">页面未找到</h2>
            <p className="text-gray-500 mb-6">您访问的页面不存在或已被移动</p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      } />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
