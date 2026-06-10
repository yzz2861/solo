import React from 'react';
import { EXHIBIT_STATUS } from '../utils/exhibitStore.js';

export default function FilterBar({ filters, onChange, stats }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="filter-item">
          <label>🔍 搜索</label>
          <input
            type="text"
            placeholder="搜索展品编号、名称、借展方..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-item">
          <label>📊 状态筛选</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">全部状态</option>
            <option value={EXHIBIT_STATUS.CONTRACTED}>已签约</option>
            <option value={EXHIBIT_STATUS.CHECKED_OUT}>已出库</option>
            <option value={EXHIBIT_STATUS.ON_DISPLAY}>在展中</option>
            <option value={EXHIBIT_STATUS.RETURNED}>已回馆</option>
            <option value={EXHIBIT_STATUS.REVIEWED}>已复核</option>
          </select>
        </div>

        <div className="filter-item">
          <label>⚠️ 异常类型</label>
          <select
            value={filters.warningType}
            onChange={(e) => handleChange('warningType', e.target.value)}
            className="filter-select"
          >
            <option value="all">全部异常</option>
            <option value={EXHIBIT_STATUS.OVERDUE}>逾期未回 ({stats.overdue})</option>
            <option value={EXHIBIT_STATUS.ABNORMAL}>验收异常 ({stats.abnormal})</option>
            <option value={EXHIBIT_STATUS.HANDLER_MISMATCH}>
              经手人不一致 ({stats.handlerMismatch})
            </option>
          </select>
        </div>

        <div className="filter-item">
          <label>🏆 珍贵等级</label>
          <select
            value={filters.level}
            onChange={(e) => handleChange('level', e.target.value)}
            className="filter-select"
          >
            <option value="all">全部等级</option>
            <option value="一级">一级文物</option>
            <option value="二级">二级文物</option>
            <option value="三级">三级文物</option>
            <option value="一般">一般文物</option>
          </select>
        </div>
      </div>
    </div>
  );
}
