import React, { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = '';

const RISK_LEVELS = {
  self_harm: { label: '自伤风险', color: 'bg-red-600', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200', priority: 1 },
  offline_threat: { label: '线下威胁', color: 'bg-orange-600', textColor: 'text-orange-700', bgLight: 'bg-orange-50', border: 'border-orange-200', priority: 2 },
  personal_attack: { label: '人身攻击', color: 'bg-amber-600', textColor: 'text-amber-700', bgLight: 'bg-amber-50', border: 'border-amber-200', priority: 3 },
  customer_service: { label: '客服跟进', color: 'bg-blue-600', textColor: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-200', priority: 4 },
  review_required: { label: '待复核', color: 'bg-purple-600', textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-200', priority: 5 },
  normal_complaint: { label: '普通吐槽', color: 'bg-gray-500', textColor: 'text-gray-600', bgLight: 'bg-gray-50', border: 'border-gray-200', priority: 6 }
};

const PROCESSING_STATUS = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  processed: { label: '已处理', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  escalated: { label: '已升级', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  dismissed: { label: '已忽略', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
};

const NAV_ITEMS = [
  { key: 'dashboard', label: '总览看板', icon: '📊' },
  { key: 'urgent', label: '紧急处理', icon: '🚨' },
  { key: 'review', label: '人工复核', icon: '🔍' },
  { key: 'messages', label: '全部消息', icon: '💬' },
  { key: 'daytime', label: '白班队列', icon: '☀️' },
  { key: 'export', label: '报告导出', icon: '📤' }
];

function HighlightedText({ content, triggers }) {
  if (!triggers || triggers.length === 0) {
    return <span>{content}</span>;
  }
  const sorted = [...triggers].sort((a, b) => a.start - b.start);
  const parts = [];
  let lastEnd = 0;
  sorted.forEach((trigger, idx) => {
    if (trigger.start > lastEnd) {
      parts.push(<span key={`text-${idx}`}>{content.slice(lastEnd, trigger.start)}</span>);
    }
    if (trigger.start >= lastEnd) {
      parts.push(
        <span
          key={`trigger-${idx}`}
          className={`trigger-highlight severity-${trigger.severity} font-medium`}
          style={{
            backgroundColor: trigger.severity === 'high' ? 'rgba(239,68,68,0.12)'
              : trigger.severity === 'medium' ? 'rgba(249,115,22,0.12)'
              : 'rgba(234,179,8,0.12)'
          }}
          title={`触发词: ${trigger.keywords?.join(', ') || trigger.text}`}
        >
          {content.slice(trigger.start, trigger.end)}
        </span>
      );
      lastEnd = trigger.end;
    }
  });
  if (lastEnd < content.length) {
    parts.push(<span key="text-end">{content.slice(lastEnd)}</span>);
  }
  return <>{parts}</>;
}

function RiskBadge({ level, confidence }) {
  const cfg = RISK_LEVELS[level] || RISK_LEVELS.normal_complaint;
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white ${cfg.color}`}>
        {cfg.label}
      </span>
      {confidence !== undefined && (
        <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = PROCESSING_STATUS[status] || PROCESSING_STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} pulse-dot`}></span>
      {cfg.label}
    </span>
  );
}

function StatCard({ title, value, subtext, icon, color, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-5 cursor-pointer transition-all duration-200 ${
        active ? `${color.bgLight} ${color.border} shadow-md ring-2 ring-offset-1` : 'bg-white border-gray-200 hover:shadow-md hover:-translate-y-0.5'
      } ring-offset-white`}
      style={active ? { '--tw-ring-color': color.bgLight } : {}}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${color.textColor}`}>{value}</p>
          {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.bgLight} text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MessageCard({ message, onClick, selected }) {
  const cls = message?.classification;
  const proc = message?.processing;
  const riskLevel = proc?.manualOverride || cls?.riskLevel;
  const cfg = RISK_LEVELS[riskLevel] || RISK_LEVELS.normal_complaint;
  const urgent = ['self_harm', 'offline_threat'].includes(riskLevel);
  const needsReview = cls?.requiresReview;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
        selected
          ? `${cfg.border} ${cfg.bgLight} shadow-lg ring-2 ring-offset-2 ring-${cfg.color.replace('bg-', '')}`
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
      } ${urgent && proc?.status === 'pending' ? 'ring-1 ring-red-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={message.avatar}
            alt=""
            className="w-9 h-9 rounded-full flex-shrink-0"
            onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/shapes/svg'; }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{message.username}</p>
            <p className="text-xs text-gray-400">{message.source || (message.type === 'comment' ? '评论' : '私信')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {urgent && <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">紧急</span>}
          {needsReview && <span className="px-2 py-0.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">待复核</span>}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
          <HighlightedText content={message.content} triggers={cls?.triggers} />
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
        <RiskBadge level={riskLevel} confidence={cls?.confidence} />
        <StatusBadge status={proc?.status || 'pending'} />
        {cls?.analysis?.sarcasm?.detected && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">反讽</span>}
        {cls?.analysis?.dialectDetected && <span className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded">方言</span>}
        {cls?.analysis?.quotedContent?.length > 0 && <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded">含引用</span>}
      </div>
    </div>
  );
}

function MessageDetail({ message, onClose, onUpdate }) {
  const [notes, setNotes] = useState(message?.processing?.notes || '');
  const [manualOverride, setManualOverride] = useState(message?.processing?.manualOverride || '');
  const [handledBy, setHandledBy] = useState(message?.processing?.handledBy || '');
  const [saving, setSaving] = useState(false);

  if (!message) return null;
  const cls = message.classification;
  const proc = message.processing;
  const riskLevel = manualOverride || cls?.riskLevel;
  const cfg = RISK_LEVELS[riskLevel] || RISK_LEVELS.normal_complaint;

  const handleSave = async (newStatus) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/messages/${message.id}/processing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes,
          manualOverride: manualOverride || null,
          handledBy: handledBy || null
        })
      });
      const data = await res.json();
      onUpdate(data);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const confidenceBar = (score, label, color) => (
    <div className="flex items-center gap-2 mb-1.5">
      <span className={`w-20 text-xs text-gray-500 flex-shrink-0`}>{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${Math.min(100, score * 100)}%` }}></div>
      </div>
      <span className="w-12 text-xs font-semibold text-gray-600 text-right">{Math.round(score * 100)}%</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${cfg.border} ${cfg.bgLight}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <img src={message.avatar} alt="" className="w-12 h-12 rounded-full flex-shrink-0"
                onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/shapes/svg'; }} />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">{message.username}</h3>
                <p className="text-sm text-gray-500">{message.source} · {proc?.createdAt}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/70 text-gray-500 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RiskBadge level={riskLevel} confidence={cls?.confidence} />
            <StatusBadge status={proc?.status || 'pending'} />
            <span className="px-2 py-0.5 text-xs bg-white/70 text-gray-600 rounded">ID: {message.id}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">消息内容</h4>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              <HighlightedText content={message.content} triggers={cls?.triggers} />
            </p>
          </div>

          {cls?.triggers && cls.triggers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">触发判断片段</h4>
              <div className="space-y-2">
                {cls.triggers.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${
                      t.severity === 'high' ? 'bg-red-100 text-red-700'
                        : t.severity === 'medium' ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t.severity === 'high' ? '高危' : t.severity === 'medium' ? '中危' : '低危'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 break-words">「{t.text}」</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        关键词: {t.keywords?.join(', ')}
                        {t.dialect && ` · ${t.dialect}方言`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">AI 分类打分</h4>
            {confidenceBar(cls?.scores?.self_harm || 0, '自伤风险', 'bg-red-500')}
            {confidenceBar(cls?.scores?.offline_threat || 0, '线下威胁', 'bg-orange-500')}
            {confidenceBar(cls?.scores?.personal_attack || 0, '人身攻击', 'bg-amber-500')}
            {confidenceBar(cls?.scores?.customer_service || 0, '客服跟进', 'bg-blue-500')}
            {confidenceBar(cls?.scores?.normal_complaint || 0, '普通吐槽', 'bg-gray-400')}
          </div>

          {(cls?.analysis?.sarcasm?.detected || cls?.analysis?.dialectDetected || (cls?.analysis?.quotedContent?.length > 0) || (cls?.analysis?.context?.info?.length > 0)) && (
            <div className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl">
              <h4 className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-3">智能分析洞察</h4>
              <div className="space-y-2">
                {cls?.analysis?.sarcasm?.detected && (
                  <div className="flex items-start gap-2 p-2 bg-white/70 rounded-lg">
                    <span className="text-lg">😏</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">检测到反讽语气</p>
                      <p className="text-xs text-gray-500">置信度已自动降低，请结合上下文判断</p>
                    </div>
                  </div>
                )}
                {cls?.analysis?.dialectDetected && (
                  <div className="flex items-start gap-2 p-2 bg-white/70 rounded-lg">
                    <span className="text-lg">🗣️</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">包含方言/俚语脏话</p>
                      <p className="text-xs text-gray-500">已从多方言词库匹配识别</p>
                    </div>
                  </div>
                )}
                {cls?.analysis?.quotedContent?.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-white/70 rounded-lg">
                    <span className="text-lg">📝</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">包含引用内容</p>
                      <p className="text-xs text-gray-500">引用部分的敏感词已自动忽略，不纳入用户本人判断</p>
                      <div className="mt-2 space-y-1">
                        {cls.analysis.quotedContent.map((q, i) => (
                          <p key={i} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            引用片段: 「{q.text}」
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {cls?.analysis?.context?.info?.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-white/70 rounded-lg">
                    <span className="text-lg">🔗</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">上下文关联分析</p>
                      {cls.analysis.context.info.map((info, i) => (
                        <p key={i} className="text-xs text-gray-600 mt-1">• {info}</p>
                      ))}
                      <p className="text-xs text-blue-600 mt-1">上下文加权: +{Math.round(cls.analysis.context.bonus * 100)}%</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">人工处理</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">处理人</label>
              <input
                type="text"
                value={handledBy}
                onChange={(e) => setHandledBy(e.target.value)}
                placeholder="输入您的姓名或工号"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                人工修正等级 <span className="text-xs text-gray-400 font-normal">（如AI判断有误可在此修正）</span>
              </label>
              <select
                value={manualOverride}
                onChange={(e) => setManualOverride(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">— 不修正，使用AI判断 —</option>
                {Object.entries(RISK_LEVELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">处理备注</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="记录处理过程、沟通要点或后续操作..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleSave('processing')}
                disabled={saving}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition disabled:opacity-50"
              >
                {saving ? '保存中...' : '标记处理中'}
              </button>
              <button
                onClick={() => handleSave('processed')}
                disabled={saving}
                className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
              >
                ✅ 标记已处理
              </button>
              <button
                onClick={() => handleSave('escalated')}
                disabled={saving}
                className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                ⬆️ 升级处理
              </button>
            </div>
            <button
              onClick={() => handleSave('dismissed')}
              disabled={saving}
              className="w-full px-3 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition disabled:opacity-50"
            >
              忽略此条
            </button>
          </div>

          {proc?.handledAt && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-800">
                ✅ <strong>{proc.handledBy || '某人'}</strong> 于 <strong>{proc.handledAt}</strong> 处理完毕
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, totalCount }) {
  return (
    <div className="p-4 bg-white border-b border-gray-200 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600 mr-2">风险级别:</span>
        <button
          onClick={() => setFilters({ ...filters, riskLevel: 'all' })}
          className={`px-3 py-1 text-sm rounded-full border transition ${
            filters.riskLevel === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >全部</button>
        {Object.entries(RISK_LEVELS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilters({ ...filters, riskLevel: key })}
            className={`px-3 py-1 text-sm rounded-full border transition ${
              filters.riskLevel === key ? `${val.color} text-white border-transparent` : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >{val.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          {Object.entries(PROCESSING_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="priority">按优先级（紧急优先）</option>
          <option value="time_desc">最新消息</option>
          <option value="time_asc">最早消息</option>
        </select>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="搜索关键词、用户名..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <span className="text-sm text-gray-500">共 <strong className="text-gray-800">{totalCount}</strong> 条</span>
      </div>
    </div>
  );
}

function ExportPanel({ onExport }) {
  const [format, setFormat] = useState('csv');
  const [mask, setMask] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'csv') {
        const a = document.createElement('a');
        a.href = `${API_BASE}/api/export/report?format=csv&mask=${mask}`;
        a.download = `风险分级报告_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const res = await fetch(`${API_BASE}/api/export/report?format=json&mask=${mask}`);
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `风险分级报告_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      onExport && onExport();
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📤 导出运营报告</h2>
        <p className="text-sm text-gray-600">报告包含所有消息的风险分级、AI置信度、人工处理结果等完整信息，可提交给运营主管审阅或用于月度复盘。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <h3 className="font-semibold text-gray-800">报告格式</h3>
          <div className="space-y-2">
            {[{ value: 'csv', label: 'CSV 格式（Excel 打开）', icon: '📊', desc: '推荐用于数据表格分析、筛选、制作图表' },
              { value: 'json', label: 'JSON 格式', icon: '📋', desc: '用于系统对接、数据迁移、程序处理' }].map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                format === opt.value ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" checked={format === opt.value} onChange={() => setFormat(opt.value)} className="mt-1" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800"><span className="mr-1">{opt.icon}</span>{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <h3 className="font-semibold text-gray-800">隐私设置</h3>
          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
            mask ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} className="mt-1" />
            <div className="flex-1">
              <p className="font-medium text-gray-800">🛡️ 脱敏用户个人信息 <span className="text-xs text-red-600 font-normal">（推荐）</span></p>
              <p className="text-xs text-gray-500 mt-1">自动模糊处理用户ID、昵称、手机号、邮箱、地址等敏感信息，符合隐私合规要求</p>
              <ul className="text-xs text-gray-400 mt-2 space-y-0.5">
                <li>• 用户ID: user-10****89</li>
                <li>• 昵称: 夜空中***星</li>
                <li>• 手机: 138****5678</li>
                <li>• 邮箱: use***@example.com</li>
              </ul>
            </div>
          </label>
        </div>
      </div>

      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="font-semibold text-amber-800 mb-2">📝 报告包含字段</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-amber-700">
          {['消息ID', '用户ID（脱敏）', '用户昵称（脱敏）', '联系方式（脱敏）', '消息类型', '来源渠道',
            '消息内容', 'AI风险等级', 'AI置信度', '是否需复核', '人工修正等级', '最终风险等级',
            '处理状态', '处理人', '处理备注', '处理时间', '消息时间', '触发关键词',
            '反讽检测', '方言检测', '引用内容标记'].map(field => (
            <span key={field} className="px-2 py-1 bg-white/60 rounded">· {field}</span>
          ))}
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg transition disabled:opacity-60"
      >
        {exporting ? '正在生成报告...' : '🚀 生成并下载报告'}
      </button>
    </div>
  );
}

export default function App() {
  const [currentNav, setCurrentNav] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filters, setFilters] = useState({ riskLevel: 'all', status: 'all', sortBy: 'priority', search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, msgRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats`).then(r => r.json()),
        fetch(`${API_BASE}/api/messages?pageSize=100&riskLevel=${filters.riskLevel}&status=${filters.status}&sortBy=${filters.sortBy}${filters.search ? '&search=' + encodeURIComponent(filters.search) : ''}`).then(r => r.json())
      ]);
      setStats(statsRes);
      setMessages(msgRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayMessages = useMemo(() => {
    let msgs = messages;
    if (currentNav === 'urgent') {
      msgs = msgs.filter(m => ['self_harm', 'offline_threat'].includes(m.classification?.riskLevel));
    } else if (currentNav === 'review') {
      msgs = msgs.filter(m => m.classification?.requiresReview || m.classification?.riskLevel === 'review_required');
    } else if (currentNav === 'daytime') {
      msgs = msgs.filter(m => m.classification?.riskLevel === 'normal_complaint');
    }
    return msgs;
  }, [messages, currentNav]);

  const navCounts = useMemo(() => ({
    dashboard: stats?.total || 0,
    urgent: stats?.urgentCount || 0,
    review: stats?.reviewRequiredCount || 0,
    messages: stats?.total || 0,
    daytime: stats?.byRiskLevel?.normal_complaint || 0,
    export: 0
  }), [stats]);

  const handleUpdateMessage = (updated) => {
    setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    setSelectedMessage(updated);
    fetchData();
  };

  const statCardColors = {
    urgent: { textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200' },
    review: { textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-200' },
    pending: { textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', border: 'border-yellow-200' },
    processed: { textColor: 'text-green-700', bgLight: 'bg-green-50', border: 'border-green-200' }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg">
              🛡️
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base">风险分级系统</h1>
              <p className="text-xs text-gray-500">社区内容安全平台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(item => {
            const active = currentNav === item.key;
            const count = navCounts[item.key];
            return (
              <button
                key={item.key}
                onClick={() => setCurrentNav(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-semibold ${
                    active ? 'bg-indigo-600 text-white'
                      : item.key === 'urgent' ? 'bg-red-500 text-white'
                      : item.key === 'review' ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">运</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">值班运营</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot"></span>
                在线 · 夜班
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-60 min-h-screen">
        {currentNav === 'dashboard' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">总览看板</h1>
                <p className="text-sm text-gray-500 mt-1">实时掌握内容安全态势，快速定位高风险消息</p>
              </div>
              <button
                onClick={() => setCurrentNav('export')}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
              >
                📤 导出报告
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="紧急风险（需立即处理）"
                value={stats?.urgentCount || 0}
                subtext="自伤风险 + 线下威胁"
                icon="🚨"
                color={statCardColors.urgent}
                onClick={() => setCurrentNav('urgent')}
              />
              <StatCard
                title="待人工复核"
                value={stats?.reviewRequiredCount || 0}
                subtext="低置信度 / 歧义内容"
                icon="🔍"
                color={statCardColors.review}
                onClick={() => setCurrentNav('review')}
              />
              <StatCard
                title="待处理消息"
                value={stats?.pendingCount || 0}
                subtext="等待运营人员处理"
                icon="⏳"
                color={statCardColors.pending}
              />
              <StatCard
                title="已处理"
                value={stats?.processedCount || 0}
                subtext="处理完成 + 已升级 + 已忽略"
                icon="✅"
                color={statCardColors.processed}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">📊 风险等级分布</h3>
                <div className="space-y-3">
                  {Object.entries(RISK_LEVELS).map(([key, cfg]) => {
                    const count = stats?.byRiskLevel?.[key] || 0;
                    const total = stats?.total || 1;
                    const pct = Math.round(count / total * 100);
                    return (
                      <div key={key} className="group cursor-pointer" onClick={() => { setFilters({ ...filters, riskLevel: key }); setCurrentNav('messages'); }}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded ${cfg.color}`}></span>
                            <span className="font-medium text-gray-700 group-hover:text-indigo-600 transition">{cfg.label}</span>
                          </span>
                          <span className="text-gray-500">
                            <strong className="text-gray-800">{count}</strong> 条 <span className="text-xs">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cfg.color} transition-all duration-500 group-hover:opacity-80`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">⚡ 快速操作</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { nav: 'urgent', icon: '🚨', title: '处理紧急风险', desc: `${stats?.urgentCount || 0} 条需立即响应`, gradient: 'from-red-500 to-orange-500' },
                    { nav: 'review', icon: '🔍', title: '人工复核队列', desc: `${stats?.reviewRequiredCount || 0} 条低把握内容`, gradient: 'from-purple-500 to-pink-500' },
                    { nav: 'daytime', icon: '☀️', title: '白班处理队列', desc: `${stats?.byRiskLevel?.normal_complaint || 0} 条普通吐槽`, gradient: 'from-amber-400 to-yellow-500' },
                    { nav: 'export', icon: '📤', title: '导出运营报告', desc: '脱敏数据 + 处理结果', gradient: 'from-blue-500 to-indigo-500' }
                  ].map(act => (
                    <button
                      key={act.nav}
                      onClick={() => setCurrentNav(act.nav)}
                      className={`p-4 rounded-xl text-left bg-gradient-to-br ${act.gradient} text-white hover:shadow-lg hover:-translate-y-0.5 transition-all`}
                    >
                      <div className="text-2xl mb-1">{act.icon}</div>
                      <p className="font-semibold">{act.title}</p>
                      <p className="text-xs opacity-80 mt-0.5">{act.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">🔥 高优先级消息预览</h3>
                <button onClick={() => setCurrentNav('messages')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">查看全部 →</button>
              </div>
              {loading ? (
                <div className="py-8 text-center text-gray-400">加载中...</div>
              ) : displayMessages.length === 0 ? (
                <div className="py-8 text-center text-gray-400">暂无消息</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {messages.slice(0, 6).map(msg => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      onClick={() => setSelectedMessage(msg)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(currentNav === 'urgent' || currentNav === 'review' || currentNav === 'messages' || currentNav === 'daytime') && (
          <div className="flex flex-col h-screen overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentNav === 'urgent' && '🚨 紧急处理队列'}
                    {currentNav === 'review' && '🔍 人工复核队列'}
                    {currentNav === 'messages' && '💬 全部消息'}
                    {currentNav === 'daytime' && '☀️ 白班处理队列'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentNav === 'urgent' && '自伤风险和线下威胁需要在15分钟内响应处理'}
                    {currentNav === 'review' && 'AI置信度较低或有歧义的内容，需要人工二次判断'}
                    {currentNav === 'messages' && '所有评论和私信消息，支持多条件筛选'}
                    {currentNav === 'daytime' && '普通吐槽类消息，留给白班运营从容处理'}
                  </p>
                </div>
              </div>
            </div>

            <FilterBar filters={filters} setFilters={setFilters} totalCount={displayMessages.length} />

            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-500">加载中...</p>
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-gray-500 font-medium">太棒了！当前没有需要处理的消息</p>
                  <p className="text-sm text-gray-400 mt-1">尝试调整筛选条件查看其他消息</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayMessages.map(msg => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      onClick={() => setSelectedMessage(msg)}
                      selected={selectedMessage?.id === msg.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentNav === 'export' && <ExportPanel onExport={() => setTimeout(fetchData, 500)} />}
      </main>

      {selectedMessage && (
        <MessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onUpdate={handleUpdateMessage}
        />
      )}
    </div>
  );
}
