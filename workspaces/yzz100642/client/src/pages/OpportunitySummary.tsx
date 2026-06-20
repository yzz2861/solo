import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import { getSummaryByOpportunity } from '../api';
import type { OpportunitySummary } from '../types';
import { getTypeLabel, getTypeColor } from '../utils';

export default function OpportunitySummary() {
  const [summary, setSummary] = useState<OpportunitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getSummaryByOpportunity();
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to load opportunity summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const totalOpps = summary.length;
  const totalCommitments = summary.reduce((acc, o) => acc + o.commitment_count, 0);

  return (
    <div>
      <PageHeader
        title="按机会汇总"
        description="查看每个销售机会的承诺明细"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BriefcaseIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">机会总数</p>
              <p className="text-2xl font-bold text-slate-800">{totalOpps}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">承诺总数</p>
              <p className="text-2xl font-bold text-slate-800">{totalCommitments}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <UserGroupIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">涉及客户</p>
              <p className="text-2xl font-bold text-slate-800">{new Set(summary.map(s => s.customer_id)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {summary.length > 0 ? (
        <div className="space-y-6">
          {summary.map((opp, idx) => (
            <div
              key={opp.opportunity_id}
              className="card p-6 animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{opp.opportunity_name}</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4" />
                    {opp.customer_name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">{opp.commitment_count}</div>
                  <div className="text-xs text-slate-500">条承诺</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1 text-emerald-600 text-sm">
                  <CheckCircleIcon className="w-4 h-4" />
                  {opp.approved_count} 已批准
                </span>
                <span className="flex items-center gap-1 text-amber-600 text-sm">
                  <ClockIcon className="w-4 h-4" />
                  {opp.commitment_count - opp.approved_count} 待处理
                </span>
              </div>

              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                  style={{
                    width: `${opp.commitment_count > 0 ? (opp.approved_count / opp.commitment_count) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {Object.entries(opp.commitments_by_type).map(([type, count]) => (
                  <div
                    key={type}
                    className={`p-3 rounded-lg border-2 ${getTypeColor(type as any)} border-current`}
                  >
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-slate-600">{getTypeLabel(type as any)}</div>
                  </div>
                ))}
              </div>

              {opp.low_confidence_count > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                  <p className="text-sm text-amber-700">
                    ⚠️ 有 <strong>{opp.low_confidence_count}</strong> 条承诺置信度较低，请重点审核
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Link
                  to={`/commitments?opportunity_id=${opp.opportunity_id}`}
                  className="btn-secondary text-sm"
                >
                  查看全部承诺
                </Link>
                <Link
                  to={`/delivery?opportunity_id=${opp.opportunity_id}`}
                  className="btn-primary text-sm"
                >
                  交付对接视图
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <BriefcaseIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">暂无销售机会数据</p>
          <Link to="/import" className="text-primary-600 hover:underline mt-2 inline-block">
            导入聊天记录
          </Link>
        </div>
      )}
    </div>
  );
}
