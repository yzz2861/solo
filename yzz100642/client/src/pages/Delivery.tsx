import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  TruckIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  UserIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ClockIcon,
  GiftIcon,
  ShieldCheckIcon,
  CurrencyYenIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import { getDeliveryHandover, exportCommitments } from '../api';
import type { Commitment } from '../types';
import { getTypeLabel, formatDateTime, downloadFile } from '../utils';

const typeIcons: Record<string, any> = {
  price: CurrencyYenIcon,
  gift: GiftIcon,
  delivery: TruckIcon,
  aftersales: ShieldCheckIcon,
  condition: QuestionMarkCircleIcon,
};

const typeColors: Record<string, string> = {
  price: 'bg-blue-50 border-blue-200 text-blue-700',
  gift: 'bg-pink-50 border-pink-200 text-pink-700',
  delivery: 'bg-purple-50 border-purple-200 text-purple-700',
  aftersales: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  condition: 'bg-amber-50 border-amber-200 text-amber-700',
};

export default function Delivery() {
  const [searchParams] = useSearchParams();
  const opportunityId = searchParams.get('opportunity_id');
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<number | 'all'>('all');

  useEffect(() => {
    loadData();
    if (opportunityId) {
      setSelectedOpportunity(Number(opportunityId));
    }
  }, [opportunityId]);

  const loadData = async () => {
    try {
      const res = await getDeliveryHandover({
        opportunity_id: opportunityId ? Number(opportunityId) : undefined,
      });
      setCommitments(res.data);
    } catch (error) {
      console.error('Failed to load delivery handover:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportCommitments({
        format: 'csv',
        status: 'approved',
        opportunity_id: selectedOpportunity === 'all' ? undefined : Number(selectedOpportunity),
      });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'text/csv' });
      downloadFile(blob, '交付承诺清单.csv');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    }
  };

  const groupedByOpportunity = commitments.reduce((acc, c) => {
    const key = `${c.opportunity_id}-${c.opportunity_name}-${c.customer_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, Commitment[]>);

  const approvedCount = commitments.filter((c) => c.status === 'approved').length;
  const totalCount = commitments.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="交付对接"
        description="查看已批准的承诺清单，供交付团队执行"
        actions={
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            导出交付清单
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm text-emerald-600 font-medium">已批准承诺</p>
              <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">报价折扣</p>
              <p className="text-2xl font-bold text-slate-800">
                {commitments.filter((c) => c.type === 'price').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <GiftIcon className="w-8 h-8 text-pink-500" />
            <div>
              <p className="text-sm text-slate-500">赠品</p>
              <p className="text-2xl font-bold text-slate-800">
                {commitments.filter((c) => c.type === 'gift').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <TruckIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">交付时间</p>
              <p className="text-2xl font-bold text-slate-800">
                {commitments.filter((c) => c.type === 'delivery').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-5 mb-6 border border-primary-200">
        <div className="flex items-center gap-3">
          <TruckIcon className="w-10 h-10 text-primary-600" />
          <div>
            <h3 className="font-semibold text-primary-800">交付团队请注意</h3>
            <p className="text-sm text-primary-700 mt-1">
              以下为已通过审批的客户承诺，请严格按照承诺内容执行。如有疑问请联系对应销售主管。
            </p>
          </div>
        </div>
      </div>

      {totalCount > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedByOpportunity).map(([key, oppCommitments], oppIdx) => {
            const [oppId, oppName, customerName] = key.split('-');
            const oppApproved = oppCommitments.filter((c) => c.status === 'approved');

            return (
              <div key={key} className="animate-fade-in" style={{ animationDelay: `${oppIdx * 100}ms` }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <BriefcaseIcon className="w-6 h-6 text-primary-600" />
                      {oppName}
                    </h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      {customerName}
                      <span className="mx-2">·</span>
                      <span>{oppApproved.length} / {oppCommitments.length} 条已批准</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 font-medium">{oppApproved.length} 条可执行</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {oppCommitments.map((c, idx) => {
                    const Icon = typeIcons[c.type] || DocumentTextIcon;
                    const isApproved = c.status === 'approved';

                    return (
                      <div
                        key={c.id}
                        className={`card p-5 border-l-4 transition-all ${
                          isApproved
                            ? 'border-l-emerald-500 hover:shadow-md'
                            : 'border-l-amber-400 opacity-70 bg-slate-50'
                        }`}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${typeColors[c.type] || 'bg-slate-100'}`}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-medium text-slate-700">{getTypeLabel(c.type)}</span>
                              <span className={`badge ${isApproved ? 'status-approved' : 'status-pending'}`}>
                                {isApproved ? '可执行' : '待审批'}
                              </span>
                              {c.contract_reference && (
                                <span className="badge bg-primary-50 text-primary-700 border-primary-200">
                                  <DocumentDuplicateIcon className="w-3 h-3 inline mr-1" />
                                  {c.contract_reference}
                                </span>
                              )}
                            </div>

                            <p className="text-slate-800 font-medium text-lg">{c.content}</p>

                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border-l-2 border-slate-300">
                              <p className="text-sm text-slate-600 italic">
                                <span className="font-medium not-italic text-slate-500">原句：</span>
                                「{c.original_sentence}」
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4 text-slate-500">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="w-4 h-4" />
                                  {c.sender}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  {formatDateTime(c.message_time)}
                                </span>
                              </div>
                              <Link
                                to={`/commitments/${c.id}`}
                                className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                              >
                                查看详情 →
                              </Link>
                            </div>

                            {c.notes && (
                              <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                                <p className="text-sm text-amber-700">
                                  <span className="font-medium">备注：</span>{c.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {isApproved && (
                            <div className="text-emerald-500">
                              <CheckCircleIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <TruckIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">暂无交付承诺</p>
          <p className="text-slate-400 mt-1">所有承诺都需要经过主管审批后才会显示在这里</p>
          <Link to="/approvals" className="text-primary-600 hover:underline mt-4 inline-block">
            前往审批工作台
          </Link>
        </div>
      )}
    </div>
  );
}
