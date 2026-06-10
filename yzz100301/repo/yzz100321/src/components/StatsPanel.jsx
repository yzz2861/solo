import React from 'react';

export default function StatsPanel({ stats }) {
  const statItems = [
    { label: '展品总数', value: stats.total, color: '#2c3e50', icon: '📋' },
    { label: '在展中', value: stats.onDisplay, color: '#3498db', icon: '🖼️' },
    { label: '已回馆', value: stats.returned, color: '#27ae60', icon: '✅' },
    { label: '已复核', value: stats.reviewed, color: '#9b59b6', icon: '📝' },
  ];

  const warningItems = [
    { label: '逾期未回', value: stats.overdue, color: '#e74c3c', icon: '⏰' },
    { label: '验收异常', value: stats.abnormal, color: '#e67e22', icon: '⚠️' },
    { label: '经手人不一致', value: stats.handlerMismatch, color: '#f39c12', icon: '🔄' },
  ];

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        {statItems.map((item, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ background: `${item.color}20`, color: item.color }}>
              {item.icon}
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: item.color }}>{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="warning-stats">
        <div className="warning-title">异常提醒</div>
        <div className="warning-grid">
          {warningItems.map((item, index) => (
            <div
              key={index}
              className={`warning-item ${item.value > 0 ? 'has-warning' : ''}`}
            >
              <span className="warning-icon">{item.icon}</span>
              <span className="warning-label">{item.label}</span>
              <span className="warning-count" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
