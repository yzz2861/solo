import React, { useState } from 'react';

export default function Header({ onImport, onExport, onLoadDemo, exhibitCount, selectedCount }) {
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">博物馆借展管理系统</span>
        </div>
      </div>

      <div className="header-center">
        <div className="header-stats">
          <span className="stat-badge">共 {exhibitCount} 件展品</span>
          {selectedCount > 0 && (
            <span className="stat-badge selected">已选 {selectedCount} 件</span>
          )}
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-demo" onClick={onLoadDemo}>
          <span>🎯</span> 加载演示数据
        </button>

        <div className="header-menu">
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowImportMenu(!showImportMenu);
              setShowExportMenu(false);
            }}
          >
            <span>📥</span> 导入数据
          </button>
          {showImportMenu && (
            <div className="dropdown-menu">
              <button onClick={() => { onImport('contract'); setShowImportMenu(false); }}>
                📄 合同清单 CSV
              </button>
              <button onClick={() => { onImport('checkout'); setShowImportMenu(false); }}>
                📦 出库扫描 CSV
              </button>
              <button onClick={() => { onImport('return'); setShowImportMenu(false); }}>
                🏠 回馆验收 JSON
              </button>
            </div>
          )}
        </div>

        <div className="header-menu">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowExportMenu(!showExportMenu);
              setShowImportMenu(false);
            }}
          >
            <span>📤</span> 导出报告
          </button>
          {showExportMenu && (
            <div className="dropdown-menu">
              <button onClick={() => { onExport('csv'); setShowExportMenu(false); }}>
                📊 CSV 格式报告
              </button>
              <button onClick={() => { onExport('html'); setShowExportMenu(false); }}>
                🌐 HTML 格式报告
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
