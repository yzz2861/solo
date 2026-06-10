import React from 'react';
import { STATUS_LABELS, EXHIBIT_STATUS } from '../utils/exhibitStore.js';

export default function ExhibitTable({
  exhibits,
  selectedId,
  selectedIds,
  onSelect,
  onToggleSelect,
  onSelectAll,
}) {
  const getStatusColor = (status) => {
    const colors = {
      [EXHIBIT_STATUS.CONTRACTED]: '#3498db',
      [EXHIBIT_STATUS.CHECKED_OUT]: '#2980b9',
      [EXHIBIT_STATUS.ON_DISPLAY]: '#27ae60',
      [EXHIBIT_STATUS.RETURNED]: '#16a085',
      [EXHIBIT_STATUS.REVIEWED]: '#9b59b6',
      [EXHIBIT_STATUS.OVERDUE]: '#e74c3c',
      [EXHIBIT_STATUS.ABNORMAL]: '#e67e22',
      [EXHIBIT_STATUS.HANDLER_MISMATCH]: '#f39c12',
    };
    return colors[status] || '#95a5a6';
  };

  const allSelected = exhibits.length > 0 && selectedIds.size === exhibits.length;

  return (
    <div className="exhibit-table-container">
      <div className="table-header">
        <span className="table-title">展品清单</span>
        <span className="table-count">共 {exhibits.length} 条记录</span>
      </div>

      <div className="exhibit-table-wrapper">
        <table className="exhibit-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                />
              </th>
              <th>展品编号</th>
              <th>展品名称</th>
              <th>等级</th>
              <th>借展方</th>
              <th>状态</th>
              <th>出库日期</th>
              <th>应还日期</th>
            </tr>
          </thead>
          <tbody>
            {exhibits.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <div className="empty-text">暂无展品数据</div>
                    <div className="empty-hint">请先导入合同清单、出库扫描或回馆验收数据</div>
                  </div>
                </td>
              </tr>
            ) : (
              exhibits.map((exhibit) => (
                <tr
                  key={exhibit.exhibitId}
                  className={`exhibit-row ${selectedId === exhibit.exhibitId ? 'selected' : ''}
                    ${exhibit.warnings.length > 0 ? 'has-warning' : ''}`}
                  onClick={() => onSelect(exhibit.exhibitId)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(exhibit.exhibitId)}
                      onChange={() => onToggleSelect(exhibit.exhibitId)}
                    />
                  </td>
                  <td className="exhibit-id">{exhibit.exhibitId}</td>
                  <td className="exhibit-name">{exhibit.exhibitName || '-'}</td>
                  <td>
                    {exhibit.level ? (
                      <span className={`level-badge level-${exhibit.level}`}>
                        {exhibit.level}
                      </span>
                    ) : '-'}
                  </td>
                  <td>{exhibit.contract?.borrower || '-'}</td>
                  <td>
                    <div className="status-tags">
                      {exhibit.warnings.length > 0 ? (
                        exhibit.warnings.map((w) => (
                          <span
                            key={w}
                            className="status-tag warning"
                            style={{ background: `${getStatusColor(w)}20`, color: getStatusColor(w) }}
                          >
                            {STATUS_LABELS[w]}
                          </span>
                        ))
                      ) : (
                        exhibit.statuses.slice(-1).map((s) => (
                          <span
                            key={s}
                            className="status-tag"
                            style={{ background: `${getStatusColor(s)}20`, color: getStatusColor(s) }}
                          >
                            {STATUS_LABELS[s]}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>{exhibit.checkout?.checkoutDate || '-'}</td>
                  <td className={exhibit.warnings.includes(EXHIBIT_STATUS.OVERDUE) ? 'overdue-date' : ''}>
                    {exhibit.contract?.dueDate || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
