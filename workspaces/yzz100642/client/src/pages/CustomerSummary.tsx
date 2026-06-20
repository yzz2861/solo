import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserGroupIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import { getSummaryByCustomer } from '../api';
import type { CustomerSummary } from '../types';

export default function CustomerSummary() {
  const [summary, setSummary] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getSummaryByCustomer();
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to load customer summary:', error);
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

  const totalCustomers = summary.length;
  const totalCommitments = summary.reduce((acc, c) => acc + c.commitment_count, 0);
  const totalApproved = summary.reduce((acc, c) => acc + c.approved_count, 0);

  return (
    <div>
      <PageHeader
        title="按客户汇总"
        description="查看每个客户的所有承诺汇总情况"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">客户总数</p>
              <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
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
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已批准</p>
              <p className="text-2xl font-bold text-slate-800">{totalApproved}</p>
            </div>
          </div>
        </div>
      </div>

      {summary.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {summary.map((customer, idx) => (
            <div
              key={customer.customer_id}
              className="card p-6 animate-slide-up hover:shadow-md transition-shadow"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{customer.customer_name}</h3>
                  <p className="text-sm text-slate-500 mt-1">共 {customer.opportunities.length} 个销售机会</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">{customer.commitment_count}</div>
                  <div className="text-xs text-slate-500">条承诺</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  {customer.approved_count} 已批准
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <ClockIcon className="w-4 h-4" />
                  {customer.commitment_count - customer.approved_count} 待处理
                </span>
              </div>

              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all"
                  style={{
                    width: `${customer.commitment_count > 0 ? (customer.approved_count / customer.commitment_count) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className="space-y-3">
                {customer.opportunities.map((opp) => (
                  <div
                    key={opp.opportunity_id}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/commitments?opportunity_id=${opp.opportunity_id}`}
                        className="font-medium text-slate-700 hover:text-primary-600"
                      >
                        {opp.opportunity_name}
                      </Link>
                      <span className="text-xs text-slate-400">{opp.commitment_count} 条承诺</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-emerald-600">{opp.approved_count} 已批准</span>
                      <span className="text-amber-600">{opp.commitment_count - opp.approved_count} 待处理</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link
                  to={`/commitments?customer_id=${customer.customer_id}`}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  查看该客户全部承诺 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <UserGroupIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">暂无客户数据</p>
          <Link to="/import" className="text-primary-600 hover:underline mt-2 inline-block">
            导入聊天记录
          </Link>
        </div>
      )}
    </div>
  );
}
