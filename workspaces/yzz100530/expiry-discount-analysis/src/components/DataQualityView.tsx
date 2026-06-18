import { useState } from 'react';
import { useData } from '../context/DataContext';
import type { DataQualityIssue } from '../types';
import './DataQualityView.css';

const issueTypeLabels: Record<DataQualityIssue['type'], string> = {
  expiry_format: '效期格式不统一',
  missing_loss_reason: '报损原因缺失',
  buy_get_stack: '买赠与折扣叠加',
  same_day_discount: '临期当天才打折',
  missing_shelf: '陈列位置缺失',
};

const severityColors = {
  low: '#2ecc71',
  medium: '#f39c12',
  high: '#e74c3c',
};

const severityLabels = {
  low: '低',
  medium: '中',
  high: '高',
};

const issueDescriptions: Record<DataQualityIssue['type'], { impact: string; suggestion: string; example: string }> = {
  expiry_format: {
    impact: '不同格式的效期日期可能导致计算错误，影响临期预警和折扣时机判断',
    suggestion: '统一使用 ISO 格式 (YYYY-MM-DD) 记录效期，系统导入时自动转换',
    example: '例如："2026-06-20"、"2026/06/20"、"2026年6月20日" 被系统识别为同一日期',
  },
  missing_loss_reason: {
    impact: '缺少报损原因无法追溯问题根源，难以制定针对性改进措施',
    suggestion: '强制要求填写报损原因，并提供标准化选项（过期、破损、质量问题等）',
    example: '如果大量报损原因是"过期"，说明采购量过大或销售不及预期',
  },
  buy_get_stack: {
    impact: '买赠活动与折扣叠加会稀释利润，且可能影响折扣效果的准确评估',
    suggestion: '记录促销叠加情况，分析时区分纯折扣效果和叠加效果，设定叠加规则',
    example: '"买二送一" + "8折" 的实际折扣率不是简单相加，需要单独计算',
  },
  same_day_discount: {
    impact: '临期当天才启动折扣，清仓时间窗口太短，大概率导致报损',
    suggestion: '建立临期预警机制，在效期前 3-5 天启动折扣，越早折扣力度可越小',
    example: '某商品效期7天，建议第4天开始9折，第5天8折，第6天7折，第7天5折',
  },
  missing_shelf: {
    impact: '缺少陈列位置信息，无法分析位置对销量的影响，复盘时缺少关键维度',
    suggestion: '库存和折扣记录中增加陈列位置字段，店长调整位置时及时更新',
    example: '同样的折扣力度，端头架销量可能比普通货架高 30%',
  },
};

export default function DataQualityView() {
  const { dataQualityIssues, inventory, discounts, sales, losses } = useData();
  const [selectedIssue, setSelectedIssue] = useState<DataQualityIssue | null>(
    dataQualityIssues[0] || null
  );

  const totalRecords = inventory.length + discounts.length + sales.length + losses.length;
  const totalIssues = dataQualityIssues.reduce((sum, i) => sum + i.count, 0);
  const highSeverityCount = dataQualityIssues.filter((i) => i.severity === 'high').length;

  return (
    <div className="data-quality-view">
      <div className="page-header">
        <h2>数据质量说明</h2>
        <p>识别数据中存在的问题，了解分析结果的局限性和改进建议</p>
      </div>

      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon">📊</div>
          <div className="card-info">
            <div className="card-label">总记录数</div>
            <div className="card-value">{totalRecords}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon">⚠️</div>
          <div className="card-info">
            <div className="card-label">问题记录数</div>
            <div className="card-value">{totalIssues}</div>
          </div>
        </div>
        <div className="overview-card high">
          <div className="card-icon">🔴</div>
          <div className="card-info">
            <div className="card-label">高严重度问题</div>
            <div className="card-value">{highSeverityCount} 类</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon">📋</div>
          <div className="card-info">
            <div className="card-label">问题类型</div>
            <div className="card-value">{dataQualityIssues.length} 类</div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="issue-list">
          <h3>问题类型</h3>
          <div className="issue-list-items">
            {dataQualityIssues.map((issue) => (
              <div
                key={issue.type}
                className={`issue-item ${selectedIssue?.type === issue.type ? 'active' : ''}`}
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="issue-header">
                  <span className="issue-title">{issueTypeLabels[issue.type]}</span>
                  <span
                    className="severity-badge"
                    style={{
                      backgroundColor: `${severityColors[issue.severity]}20`,
                      color: severityColors[issue.severity],
                    }}
                  >
                    {severityLabels[issue.severity]}
                  </span>
                </div>
                <div className="issue-count">
                  影响 <strong>{issue.count}</strong> 条记录
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="issue-detail">
          {selectedIssue && (
            <>
              <div className="detail-header">
                <h3>{issueTypeLabels[selectedIssue.type]}</h3>
                <span
                  className="severity-label"
                  style={{
                    backgroundColor: `${severityColors[selectedIssue.severity]}20`,
                    color: severityColors[selectedIssue.severity],
                  }}
                >
                  {severityLabels[selectedIssue.severity]}严重度
                </span>
              </div>

              <p className="issue-desc">{selectedIssue.description}</p>

              <div className="detail-sections">
                <div className="detail-section impact">
                  <h4>💡 影响</h4>
                  <p>{issueDescriptions[selectedIssue.type].impact}</p>
                </div>

                <div className="detail-section suggestion">
                  <h4>✅ 改进建议</h4>
                  <p>{issueDescriptions[selectedIssue.type].suggestion}</p>
                </div>

                <div className="detail-section example">
                  <h4>📝 示例说明</h4>
                  <p>{issueDescriptions[selectedIssue.type].example}</p>
                </div>
              </div>

              <div className="affected-records">
                <h4>受影响记录示例（前10条）</h4>
                <div className="records-grid">
                  {selectedIssue.affectedRecords.map((id) => (
                    <span key={id} className="record-id">
                      {id}
                    </span>
                  ))}
                </div>
                {selectedIssue.affectedRecords.length >= 10 && (
                  <p className="more-records">
                    ...还有 {selectedIssue.count - 10} 条记录受影响
                  </p>
                )}
              </div>

              <div className="analysis-note">
                <h4>📊 分析注意事项</h4>
                <ul>
                  <li>
                    本系统已对效期格式进行自动识别和标准化处理，支持 6 种常见格式
                  </li>
                  <li>
                    报损原因缺失的记录在"原因追溯"分析中可能不完整，仅供参考
                  </li>
                  <li>
                    折扣与促销叠加的商品，其折扣率为估算值，实际利润率可能更低
                  </li>
                  <li>
                    临期当天才打折的商品，报损率通常较高，建议重点关注
                  </li>
                  <li>
                    陈列位置数据缺失时，无法进行位置与销量的关联分析
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="format-examples">
        <h3>支持的效期格式示例</h3>
        <div className="format-cards">
          <div className="format-card">
            <div className="format-name">ISO 格式</div>
            <div className="format-example">2026-06-20</div>
            <div className="format-status supported">已支持</div>
          </div>
          <div className="format-card">
            <div className="format-name">斜杠格式</div>
            <div className="format-example">2026/06/20</div>
            <div className="format-status supported">已支持</div>
          </div>
          <div className="format-card">
            <div className="format-name">美式格式</div>
            <div className="format-example">06-20-2026</div>
            <div className="format-status supported">已支持</div>
          </div>
          <div className="format-card">
            <div className="format-name">中文格式</div>
            <div className="format-example">2026年6月20日</div>
            <div className="format-status supported">已支持</div>
          </div>
          <div className="format-card">
            <div className="format-name">纯数字</div>
            <div className="format-example">20260620</div>
            <div className="format-status supported">已支持</div>
          </div>
          <div className="format-card">
            <div className="format-name">英文格式</div>
            <div className="format-example">Jun 20, 2026</div>
            <div className="format-status supported">已支持</div>
          </div>
        </div>
      </div>
    </div>
  );
}
