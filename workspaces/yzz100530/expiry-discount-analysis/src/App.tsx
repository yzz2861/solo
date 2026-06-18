import { useState } from 'react';
import { DataProvider } from './context/DataContext';
import ManagerView from './components/ManagerView';
import ProcurementView from './components/ProcurementView';
import DataQualityView from './components/DataQualityView';
import type { ViewMode } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<ViewMode>('manager');

  const tabs: { key: ViewMode; label: string; icon: string; description: string }[] = [
    { key: 'manager', label: '店长视图', icon: '🏪', description: '清仓节奏跟踪' },
    { key: 'procurement', label: '采购视图', icon: '📦', description: '品类积压分析' },
    { key: 'dataQuality', label: '数据质量', icon: '📊', description: '问题说明与建议' },
  ];

  return (
    <DataProvider>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">🛒</div>
              <div className="logo-text">
                <h1>商超临期折扣分析</h1>
                <p>Expiry Discount Analytics</p>
              </div>
            </div>
            <div className="header-info">
              <span className="date-badge">数据日期：2026-06-18</span>
            </div>
          </div>
        </header>

        <nav className="app-nav">
          <div className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <div className="tab-text">
                  <span className="tab-label">{tab.label}</span>
                  <span className="tab-desc">{tab.description}</span>
                </div>
              </button>
            ))}
          </div>
        </nav>

        <main className="app-main">
          {activeTab === 'manager' && <ManagerView />}
          {activeTab === 'procurement' && <ProcurementView />}
          {activeTab === 'dataQuality' && <DataQualityView />}
        </main>

        <footer className="app-footer">
          <p>商超临期折扣分析系统 · 帮助店长和采购优化临期商品处理策略</p>
        </footer>
      </div>
    </DataProvider>
  );
}

export default App;
