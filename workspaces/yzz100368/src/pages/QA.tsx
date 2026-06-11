import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSearch,
  Download,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Eye,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { fetchRevisions, submitQAReview, exportQA } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { FieldType } from '@shared/types';
import { FIELD_LABELS } from '@shared/types';

export default function QAPage() {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(true);
  const [activeReview, setActiveReview] = useState<any>(null);
  const [reviewResult, setReviewResult] = useState<'pass' | 'needs_recheck'>('pass');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchRevisions()
      .then((list) => {
        const filtered = onlyUnreviewed ? list.filter((x) => !x.qaResult) : list;
        setRevisions(filtered);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [onlyUnreviewed]);

  const handleSubmit = async () => {
    if (!activeReview) return;
    setSubmitting(true);
    try {
      await submitQAReview({
        revisionId: activeReview.id,
        recordId: activeReview.recordId,
        reviewer: '质控护士-赵敏',
        result: reviewResult,
        comment,
      });
      setActiveReview(null);
      setComment('');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-serif">质控中心</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {revisions.length} 条修改记录待抽查 · 身份证和手机号已自动脱敏
          </p>
        </div>
        <button
          onClick={() => exportQA(from, to)}
          className="bg-medical-800 hover:bg-medical-900 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出质控摘要
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 p-4 mb-5 flex items-end gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> 起始日期
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-44 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> 结束日期
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-44 px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mb-1">
          <input
            type="checkbox"
            checked={onlyUnreviewed}
            onChange={(e) => setOnlyUnreviewed(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-medical-700 focus:ring-medical-500"
          />
          仅显示未抽查
        </label>
        <button
          onClick={load}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors mb-1"
        >
          查询
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-serif font-semibold text-slate-900 text-sm">修改记录列表</h2>
            <span className="text-xs text-slate-400">{revisions.length} 条</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
          ) : revisions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">暂无修改记录</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {revisions.map((rv) => (
                <div
                  key={rv.id}
                  className={cn(
                    'px-5 py-3.5 cursor-pointer transition-colors',
                    activeReview?.id === rv.id ? 'bg-medical-50' : 'hover:bg-slate-50',
                  )}
                  onClick={() => {
                    setActiveReview(rv);
                    setReviewResult('pass');
                    setComment(rv.qaComment || '');
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">{rv.patientName}</span>
                        <span className="text-xs text-slate-400">{rv.visitDate}</span>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-medical-50 text-medical-700 text-xs border border-medical-100">
                          {rv.fieldLabel}
                        </span>
                        {rv.qaResult && (
                          <span className={cn(
                            'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium',
                            rv.qaResult === 'pass'
                              ? 'bg-life-50 text-life-700 border border-life-100'
                              : 'bg-danger-50 text-danger-700 border border-danger-100',
                          )}>
                            {rv.qaResult === 'pass' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {rv.qaResult === 'pass' ? '抽查通过' : '需复核'} · {rv.qaReviewer}
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="text-danger-600 line-through shrink-0">{rv.oldValue}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                        <span className="text-life-700">{rv.newValue}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>操作人：{rv.operator}</span>
                        <span>时间：{rv.operatedAt}</span>
                        {rv.reason && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{rv.reason}</span>}
                      </div>
                    </div>
                    <Link
                      to={`/record/${rv.recordId}/history`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 inline-flex items-center gap-0.5 text-xs text-medical-700 hover:text-medical-800"
                    >
                      <Eye className="w-3.5 h-3.5" /> 完整历史
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden sticky top-8 h-fit">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-medical-700" />
            <h2 className="font-serif font-semibold text-slate-900 text-sm">抽查面板</h2>
          </div>
          {!activeReview ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">从左侧选择一条修改记录开始抽查</p>
              <p className="text-xs text-slate-400 mt-1">确认修改是否偏离医生原意</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">患者 / 就诊日期</div>
                <div className="text-sm font-medium text-slate-900">{activeReview.patientName} · {activeReview.visitDate}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">字段</div>
                <div className="text-sm font-medium text-slate-900">{activeReview.fieldLabel}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">修改前（OCR识别）</div>
                <div className="text-sm text-danger-600 line-through">{activeReview.oldValue}</div>
                <div className="border-t border-slate-200 my-2.5" />
                <div className="text-xs text-slate-500 mb-1">修改后（护士确认）</div>
                <div className="text-sm text-life-700 font-medium">{activeReview.newValue}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">护士修改原因</div>
                <div className="text-sm text-slate-700">{activeReview.reason || '（未填写）'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">抽查结论</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReviewResult('pass')}
                    className={cn(
                      'py-2 rounded-md text-sm font-medium border transition-all flex items-center justify-center gap-1.5',
                      reviewResult === 'pass'
                        ? 'bg-life-600 text-white border-life-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-life-50 hover:border-life-300 hover:text-life-700',
                    )}
                  >
                    <Check className="w-4 h-4" />
                    通过
                  </button>
                  <button
                    onClick={() => setReviewResult('needs_recheck')}
                    className={cn(
                      'py-2 rounded-md text-sm font-medium border transition-all flex items-center justify-center gap-1.5',
                      reviewResult === 'needs_recheck'
                        ? 'bg-danger-600 text-white border-danger-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-danger-50 hover:border-danger-300 hover:text-danger-700',
                    )}
                  >
                    <X className="w-4 h-4" />
                    需复核
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">抽查评语</div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="填写抽查意见..."
                  className="w-full p-2.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500 resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-medical-800 hover:bg-medical-900 disabled:bg-slate-300 text-white py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg> 提交中</>
                ) : (
                  <><Check className="w-4 h-4" /> 提交抽查结果</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
