import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useData } from '../context/DataContext';
import { formatPercent } from '../utils/dateUtils';
import type { CategoryAnalysis } from '../types';
import './ProcurementView.css';

const COLORS = ['#4a90d9', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];

export default function ProcurementView() {
  const {
    categoryAnalysis,
    storeAnalysis,
    stores,
    categories,
    selectedStore,
    setSelectedStore,
    selectedCategory,
    setSelectedCategory,
  } = useData();

  const [selectedCatDetail, setSelectedCatDetail] = useState<CategoryAnalysis | null>(
    categoryAnalysis[0] || null
  );

  const lossRateData = categoryAnalysis.map((cat) => ({
    name: cat.category,
    售罄率: cat.sellThroughRate,
    报损率: cat.lossRate,
  }));

  const stockData = categoryAnalysis.map((cat) => ({
    name: cat.category,
    总库存: cat.totalStock,
    已售出: cat.totalSold,
    已报损: cat.totalLost,
  }));

  const pieData = categoryAnalysis.map((cat) => ({
    name: cat.category,
    value: cat.totalLost,
  }));

  const radarData = categoryAnalysis.map((cat) => ({
    subject: cat.category,
    售罄率: cat.sellThroughRate * 100,
    折扣力度: cat.avgDiscountRate * 100,
    报损率: cat.lossRate * 100,
    清仓天数: Math.min(cat.avgClearDays * 10, 100),
    提前天数: Math.min(cat.avgDaysBeforeExpiryAtDiscount * 10, 100),
  }));

  return (
    <div className="procurement-view">
      <div className="page-header">
        <h2>采购视图 - 品类积压分析</h2>
        <p>分析各品类临期处理表现，优化采购策略，降低报损</p>
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

      <div className="summary-row">
        <div className="summary-card primary">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">涉及品类</div>
            <div className="card-value">{categoryAnalysis.length} 个</div>
          </div>
        </div>
        <div className="summary-card success">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-label">整体售罄率</div>
            <div className="card-value">
              {formatPercent(
                categoryAnalysis.reduce((s, c) => s + c.totalSold, 0) /
                  Math.max(
                    categoryAnalysis.reduce((s, c) => s + c.totalStock, 0),
                    1
                  )
              )}
            </div>
          </div>
        </div>
        <div className="summary-card danger">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <div className="card-label">整体报损率</div>
            <div className="card-value">
              {formatPercent(
                categoryAnalysis.reduce((s, c) => s + c.totalLost, 0) /
                  Math.max(
                    categoryAnalysis.reduce((s, c) => s + c.totalStock, 0),
                    1
                  )
              )}
            </div>
          </div>
        </div>
        <div className="summary-card warning">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <div className="card-label">高风险品类</div>
            <div className="card-value">
              {categoryAnalysis.filter((c) => c.lossRate > 0.2).length} 个
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card large">
          <h3>各品类售罄率 vs 报损率</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={lossRateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value) => formatPercent(value as number)}
              />
              <Legend />
              <Bar dataKey="售罄率" fill="#2ecc71" />
              <Bar dataKey="报损率" fill="#e74c3c" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>报损分布</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>品类多维分析雷达图</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="售罄率"
                dataKey="售罄率"
                stroke="#2ecc71"
                fill="#2ecc71"
                fillOpacity={0.3}
              />
              <Radar
                name="报损率"
                dataKey="报损率"
                stroke="#e74c3c"
                fill="#e74c3c"
                fillOpacity={0.3}
              />
              <Radar
                name="折扣力度"
                dataKey="折扣力度"
                stroke="#f39c12"
                fill="#f39c12"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>库存流转明细</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={stockData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Legend />
              <Bar dataKey="已售出" stackId="a" fill="#2ecc71" />
              <Bar dataKey="已报损" stackId="a" fill="#e74c3c" />
              <Bar dataKey="总库存" fill="#ddd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="category-detail-section">
        <h3>品类详情 - 原因追溯</h3>
        <div className="category-tabs">
          {categoryAnalysis.map((cat) => (
            <button
              key={cat.category}
              className={`category-tab ${
                selectedCatDetail?.category === cat.category ? 'active' : ''
              }`}
              onClick={() => setSelectedCatDetail(cat)}
            >
              {cat.category}
              <span className="loss-badge">
                {formatPercent(cat.lossRate)}
              </span>
            </button>
          ))}
        </div>

        {selectedCatDetail && (
          <div className="category-detail-content">
            <div className="detail-metrics">
              <div className="metric-item">
                <span className="metric-label">总库存</span>
                <span className="metric-value">{selectedCatDetail.totalStock} 件</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">已售出</span>
                <span className="metric-value success">
                  {selectedCatDetail.totalSold} 件
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">已报损</span>
                <span className="metric-value danger">
                  {selectedCatDetail.totalLost} 件
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">平均折扣</span>
                <span className="metric-value warning">
                  {formatPercent(selectedCatDetail.avgDiscountRate)}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">平均提前天数</span>
                <span className="metric-value">
                  {selectedCatDetail.avgDaysBeforeExpiryAtDiscount.toFixed(1)} 天
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">平均清仓天数</span>
                <span className="metric-value">
                  {selectedCatDetail.avgClearDays.toFixed(1)} 天
                </span>
              </div>
            </div>

            <div className="detail-rows">
              <div className="detail-column">
                <h4>高风险商品</h4>
                {selectedCatDetail.highRiskProducts.length > 0 ? (
                  <ul className="risk-list">
                    {selectedCatDetail.highRiskProducts.map((p, i) => (
                      <li key={i}>
                        <span className="risk-dot"></span>
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-text">暂无高风险商品</p>
                )}
              </div>

              <div className="detail-column">
                <h4>常见报损原因</h4>
                {selectedCatDetail.commonReasons.length > 0 ? (
                  <div className="reasons-list">
                    {selectedCatDetail.commonReasons.map((r, i) => (
                      <div key={i} className="reason-item">
                        <span className="reason-name">{r.reason}</span>
                        <div className="reason-bar-wrapper">
                          <div
                            className="reason-bar"
                            style={{
                              width: `${(r.count / selectedCatDetail.commonReasons[0].count) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="reason-count">{r.count} 次</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">暂无报损原因数据</p>
                )}
              </div>
            </div>

            <div className="insights-box">
              <h4>📋 分析建议</h4>
              <ul>
                {selectedCatDetail.lossRate > 0.2 && (
                  <li>
                    该品类报损率较高（{formatPercent(selectedCatDetail.lossRate)}），建议减少进货量或缩短补货周期
                  </li>
                )}
                {selectedCatDetail.avgDaysBeforeExpiryAtDiscount < 2 && (
                  <li>
                    折扣启动时间偏晚（平均提前 {selectedCatDetail.avgDaysBeforeExpiryAtDiscount.toFixed(1)} 天），建议更早启动临期折扣
                  </li>
                )}
                {selectedCatDetail.avgClearDays > 5 && (
                  <li>
                    清仓周期较长（平均 {selectedCatDetail.avgClearDays.toFixed(1)} 天），建议加大折扣力度或更换陈列位置
                  </li>
                )}
                {selectedCatDetail.sellThroughRate < 0.5 && (
                  <li>
                    售罄率偏低（{formatPercent(selectedCatDetail.sellThroughRate)}），可考虑与供应商协商更灵活的退换货政策
                  </li>
                )}
                {selectedCatDetail.lossRate <= 0.1 &&
                  selectedCatDetail.sellThroughRate >= 0.7 && (
                    <li>该品类表现良好，可维持当前采购和促销策略</li>
                  )}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="store-comparison">
        <h3>各门店表现对比</h3>
        <div className="store-cards">
          {storeAnalysis.map((store) => (
            <div key={store.storeId} className="store-card">
              <div className="store-header">
                <h4>{store.storeName}</h4>
                <span
                  className={`store-rank ${
                    store.lossRate < 0.1
                      ? 'good'
                      : store.lossRate < 0.2
                      ? 'medium'
                      : 'bad'
                  }`}
                >
                  {store.lossRate < 0.1
                    ? '优秀'
                    : store.lossRate < 0.2
                    ? '良好'
                    : '待改进'}
                </span>
              </div>
              <div className="store-stats">
                <div className="store-stat">
                  <span className="stat-label">售罄率</span>
                  <span className="stat-value success">
                    {formatPercent(store.sellThroughRate)}
                  </span>
                </div>
                <div className="store-stat">
                  <span className="stat-label">报损率</span>
                  <span className="stat-value danger">
                    {formatPercent(store.lossRate)}
                  </span>
                </div>
              </div>
              <div className="store-categories">
                <div className="mini-bars">
                  {store.categoryBreakdown.slice(0, 4).map((cat) => (
                    <div key={cat.category} className="mini-bar-item">
                      <span className="mini-bar-label">{cat.category}</span>
                      <div className="mini-bar">
                        <div
                          className="mini-bar-fill sell"
                          style={{ width: `${cat.sellThrough * 100}%` }}
                        ></div>
                        <div
                          className="mini-bar-fill loss"
                          style={{ width: `${cat.lossRate * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
