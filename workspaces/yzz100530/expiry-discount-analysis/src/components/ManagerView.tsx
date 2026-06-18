import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { useData } from '../context/DataContext';
import { formatDate, formatPercent } from '../utils/dateUtils';
import { buildClearanceTimeline } from '../utils/analysis';
import type { DiscountPerformance } from '../types';
import './ManagerView.css';

export default function ManagerView() {
  const {
    inventory,
    discounts,
    sales,
    performance,
    stores,
    categories,
    selectedStore,
    setSelectedStore,
    selectedCategory,
    setSelectedCategory,
    notesMap,
    updateNote,
  } = useData();

  const [selectedProduct, setSelectedProduct] = useState<DiscountPerformance | null>(
    performance[0] || null
  );
  const [localNote, setLocalNote] = useState('');

  const timeline = useMemo(() => {
    if (!selectedProduct) return [];
    return buildClearanceTimeline(
      selectedProduct.sku,
      selectedProduct.storeId,
      inventory,
      discounts,
      sales
    ).map((item) => ({
      ...item,
      dateStr: formatDate(item.date),
      discountDisplay: item.discountRate ? `${(item.discountRate * 100).toFixed(0)}%` : '',
    }));
  }, [selectedProduct, inventory, discounts, sales]);

  const summaryStats = useMemo(() => {
    const totalStock = performance.reduce((sum, p) => sum + p.initialStock, 0);
    const totalSold = performance.reduce((sum, p) => sum + p.soldDuringDiscount, 0);
    const totalLost = performance.reduce((sum, p) => sum + p.lostQuantity, 0);
    const avgSellThrough = totalStock > 0 ? totalSold / totalStock : 0;
    const avgLossRate = totalStock > 0 ? totalLost / totalStock : 0;

    return {
      totalStock,
      totalSold,
      totalLost,
      avgSellThrough,
      avgLossRate,
      productCount: performance.length,
    };
  }, [performance]);

  const handleNoteSave = () => {
    if (selectedProduct) {
      const key = `${selectedProduct.sku}-${selectedProduct.storeId}`;
      updateNote(key, localNote);
    }
  };

  const currentNote = selectedProduct
    ? notesMap.get(`${selectedProduct.sku}-${selectedProduct.storeId}`) || ''
    : '';

  return (
    <div className="manager-view">
      <div className="page-header">
        <h2>店长视图 - 临期清仓节奏</h2>
        <p>跟踪折扣启动后商品的清仓进度，及时调整策略</p>
      </div>

      <div className="filters">
        <div className="filter-item">
          <label>门店</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="all">全部门店</option>
            {stores.map((s) => (
              <option key={s.storeId} value={s.storeId}>
                {s.storeName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>品类</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">全部品类</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryName}>
                {c.categoryName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-label">折扣商品数</div>
          <div className="stat-value">{summaryStats.productCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均售罄率</div>
          <div className="stat-value success">
            {formatPercent(summaryStats.avgSellThrough)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均报损率</div>
          <div className="stat-value danger">
            {formatPercent(summaryStats.avgLossRate)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">剩余库存</div>
          <div className="stat-value warning">
            {summaryStats.totalStock - summaryStats.totalSold - summaryStats.totalLost}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="product-list-panel">
          <h3>折扣商品列表</h3>
          <div className="product-list">
            {performance.map((p) => (
              <div
                key={`${p.sku}-${p.storeId}`}
                className={`product-item ${
                  selectedProduct?.sku === p.sku && selectedProduct?.storeId === p.storeId
                    ? 'active'
                    : ''
                }`}
                onClick={() => {
                  setSelectedProduct(p);
                  setLocalNote(notesMap.get(`${p.sku}-${p.storeId}`) || '');
                }}
              >
                <div className="product-info">
                  <div className="product-name">{p.productName}</div>
                  <div className="product-meta">
                    {p.category} · {p.storeName}
                  </div>
                </div>
                <div className="product-stats">
                  <div className="sell-through">
                    <span className="label">售罄率</span>
                    <span className="value">{formatPercent(p.sellThroughRate)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${p.sellThroughRate * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          {selectedProduct ? (
            <>
              <div className="detail-header">
                <h3>{selectedProduct.productName}</h3>
                <div className="detail-tags">
                  <span className="tag">{selectedProduct.category}</span>
                  <span className="tag">{selectedProduct.storeName}</span>
                  <span className="tag discount">
                    折扣 {(selectedProduct.discountRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="chart-section">
                <h4>清仓节奏</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateStr" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="stockLevel"
                      name="库存水平"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sold"
                      name="日销量"
                      stroke="#82ca9d"
                      strokeWidth={2}
                    />
                    <ReferenceLine
                      yAxisId="left"
                      x={timeline.findIndex((t) => t.discountApplied)}
                      stroke="#ff7300"
                      strokeDasharray="5 5"
                      label={{ value: '折扣开始', position: 'top' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="label">初始库存</span>
                  <span className="value">{selectedProduct.initialStock} 件</span>
                </div>
                <div className="info-item">
                  <span className="label">已售出</span>
                  <span className="value success">
                    {selectedProduct.soldDuringDiscount} 件
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">剩余</span>
                  <span className="value warning">
                    {selectedProduct.remainingAfterDiscount} 件
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">报损</span>
                  <span className="value danger">
                    {selectedProduct.lostQuantity} 件
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">距效期天数</span>
                  <span className="value">
                    {selectedProduct.daysBeforeExpiryAtDiscount} 天
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">清仓天数</span>
                  <span className="value">{selectedProduct.daysToClear} 天</span>
                </div>
                <div className="info-item full-width">
                  <span className="label">陈列位置</span>
                  <span className="value">
                    {selectedProduct.shelfLocation || '未记录'}
                  </span>
                </div>
              </div>

              <div className="notes-section">
                <h4>折扣动作 & 陈列备注</h4>
                <p className="notes-hint">
                  记录折扣调整、陈列位置变更等操作，方便复盘时分析效果
                </p>
                <textarea
                  value={localNote || currentNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  placeholder="例如：7月1日移至促销端头架，折扣从7折降至5折..."
                  rows={4}
                />
                <button className="save-btn" onClick={handleNoteSave}>
                  保存备注
                </button>
                {currentNote && (
                  <div className="saved-note">
                    <div className="note-label">已保存备注：</div>
                    <div className="note-content">{currentNote}</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">请选择一个商品查看详情</div>
          )}
        </div>
      </div>

      <div className="bottom-charts">
        <div className="chart-card">
          <h4>各商品售罄率对比</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="productName" width={100} />
              <Tooltip formatter={(value) => formatPercent(value as number)} />
              <Bar dataKey="sellThroughRate" name="售罄率" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h4>各商品报损率对比</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="productName" width={100} />
              <Tooltip formatter={(value) => formatPercent(value as number)} />
              <Bar dataKey="lossRate" name="报损率" fill="#ff7373" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
