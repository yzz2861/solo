import React, { useState, useEffect } from 'react';
import { STATUS_LABELS, EXHIBIT_STATUS } from '../utils/exhibitStore.js';

export default function ExhibitDetail({ exhibit, onSaveReview }) {
  const [reviewForm, setReviewForm] = useState({
    opinion: '',
    reviewer: '',
    result: '通过',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (exhibit?.review) {
      setReviewForm({
        opinion: exhibit.review.opinion || '',
        reviewer: exhibit.review.reviewer || '',
        result: exhibit.review.result || '通过',
      });
      setIsEditing(false);
    } else {
      setReviewForm({
        opinion: '',
        reviewer: '',
        result: '通过',
      });
      setIsEditing(false);
    }
  }, [exhibit?.exhibitId]);

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

  const handleSave = () => {
    if (!exhibit) return;
    onSaveReview(exhibit.exhibitId, reviewForm);
    setIsEditing(false);
  };

  if (!exhibit) {
    return (
      <div className="exhibit-detail empty-detail">
        <div className="empty-state large">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">请选择一件展品查看详情</div>
        </div>
      </div>
    );
  }

  return (
    <div className="exhibit-detail">
      <div className="detail-header">
        <div className="detail-title">
          <h3>{exhibit.exhibitName || '未命名展品'}</h3>
          <span className="detail-id">{exhibit.exhibitId}</span>
        </div>
        {exhibit.level && (
          <span className={`level-badge level-${exhibit.level} large`}>
            {exhibit.level}
          </span>
        )}
      </div>

      <div className="detail-status">
        <div className="status-section">
          <div className="section-title">状态</div>
          <div className="status-flow">
            {[
              { key: EXHIBIT_STATUS.CONTRACTED, label: '已签约', icon: '📝' },
              { key: EXHIBIT_STATUS.CHECKED_OUT, label: '已出库', icon: '📦' },
              { key: EXHIBIT_STATUS.ON_DISPLAY, label: '在展中', icon: '🖼️' },
              { key: EXHIBIT_STATUS.RETURNED, label: '已回馆', icon: '🏠' },
              { key: EXHIBIT_STATUS.REVIEWED, label: '已复核', icon: '✅' },
            ].map((step, index) => {
              const isActive = exhibit.statuses.includes(step.key);
              return (
                <React.Fragment key={step.key}>
                  <div className={`status-step ${isActive ? 'active' : ''}`}>
                    <div
                      className="step-icon"
                      style={{
                        background: isActive ? getStatusColor(step.key) : '#e0e0e0',
                        color: isActive ? '#fff' : '#999',
                      }}
                    >
                      {step.icon}
                    </div>
                    <div className="step-label">{step.label}</div>
                  </div>
                  {index < 4 && (
                    <div
                      className={`step-line ${exhibit.statuses.includes(
                        [EXHIBIT_STATUS.CONTRACTED, EXHIBIT_STATUS.CHECKED_OUT,
                         EXHIBIT_STATUS.ON_DISPLAY, EXHIBIT_STATUS.RETURNED][index + 1]
                      ) ? 'active' : ''}`}
                      style={{
                        background: exhibit.statuses.includes(
                          [EXHIBIT_STATUS.CONTRACTED, EXHIBIT_STATUS.CHECKED_OUT,
                           EXHIBIT_STATUS.ON_DISPLAY, EXHIBIT_STATUS.RETURNED][index + 1]
                        ) ? '#27ae60' : '#e0e0e0',
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {exhibit.warnings.length > 0 && (
          <div className="warnings-section">
            <div className="section-title warning">⚠️ 异常提醒</div>
            <div className="warning-list">
              {exhibit.warnings.map((w) => (
                <div
                  key={w}
                  className="warning-item"
                  style={{ borderColor: getStatusColor(w) }}
                >
                  <span
                    className="warning-icon"
                    style={{ color: getStatusColor(w) }}
                  >
                    {w === EXHIBIT_STATUS.OVERDUE && '⏰'}
                    {w === EXHIBIT_STATUS.ABNORMAL && '⚠️'}
                    {w === EXHIBIT_STATUS.HANDLER_MISMATCH && '🔄'}
                  </span>
                  <span className="warning-text">{STATUS_LABELS[w]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="detail-sections">
        <div className="info-section">
          <div className="section-title">合同信息</div>
          <div className="info-grid">
            <InfoItem label="合同编号" value={exhibit.contract?.contractNo} />
            <InfoItem label="借展方" value={exhibit.contract?.borrower} />
            <InfoItem label="借出日期" value={exhibit.contract?.loanStartDate} />
            <InfoItem label="应还日期" value={exhibit.contract?.dueDate} />
            <InfoItem label="类别" value={exhibit.category} />
            <InfoItem label="经手人" value={exhibit.contract?.handler} />
          </div>
        </div>

        <div className="info-section">
          <div className="section-title">出库信息</div>
          <div className="info-grid">
            <InfoItem label="出库日期" value={exhibit.checkout?.checkoutDate} />
            <InfoItem label="出库经手人" value={exhibit.checkout?.handler} />
            <InfoItem label="存放位置" value={exhibit.checkout?.location} />
          </div>
        </div>

        <div className="info-section">
          <div className="section-title">回馆验收</div>
          <div className="info-grid">
            <InfoItem label="回馆日期" value={exhibit.return?.returnDate} />
            <InfoItem
              label="验收等级"
              value={exhibit.return?.acceptanceLevel}
              highlight={
                exhibit.return?.acceptanceLevel &&
                exhibit.return.acceptanceLevel !== '完好'
              }
            />
            <InfoItem label="验收人" value={exhibit.return?.handler} />
            <InfoItem label="状况描述" value={exhibit.return?.condition} full />
          </div>
        </div>

        <div className="info-section">
          <div className="section-title">
            复核意见
            {!isEditing && (
              <button
                className="btn-link"
                onClick={() => setIsEditing(true)}
              >
                {exhibit.review ? '编辑' : '添加'}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="review-form">
              <div className="form-row">
                <label>复核结果</label>
                <select
                  value={reviewForm.result}
                  onChange={(e) => setReviewForm({ ...reviewForm, result: e.target.value })}
                >
                  <option value="通过">通过</option>
                  <option value="需修复">需修复</option>
                  <option value="待确认">待确认</option>
                  <option value="异常">异常</option>
                </select>
              </div>
              <div className="form-row">
                <label>复核人</label>
                <input
                  type="text"
                  value={reviewForm.reviewer}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewer: e.target.value })}
                  placeholder="请输入复核人姓名"
                />
              </div>
              <div className="form-row">
                <label>复核意见</label>
                <textarea
                  value={reviewForm.opinion}
                  onChange={(e) => setReviewForm({ ...reviewForm, opinion: e.target.value })}
                  placeholder="请输入复核意见..."
                  rows={4}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="review-display">
              {exhibit.review ? (
                <>
                  <div className="review-result">
                    <span className={`result-badge result-${exhibit.review.result}`}>
                      {exhibit.review.result}
                    </span>
                  </div>
                  <div className="review-opinion">
                    {exhibit.review.opinion || '暂无复核意见'}
                  </div>
                  <div className="review-meta">
                    <span>复核人：{exhibit.review.reviewer || '-'}</span>
                    <span>
                      复核时间：
                      {exhibit.review.updatedAt
                        ? new Date(exhibit.review.updatedAt).toLocaleString('zh-CN')
                        : '-'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="no-review">
                  <span>暂无复核意见</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, full, highlight }) {
  return (
    <div className={`info-item ${full ? 'full' : ''}`}>
      <span className="info-label">{label}</span>
      <span className={`info-value ${highlight ? 'highlight' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );
}
