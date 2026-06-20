import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import CommitmentCard from '../components/CommitmentCard';
import { getCommitments, getOpportunities, getCustomers } from '../api';
import type { Commitment, Opportunity, Customer } from '../types';

export default function Dashboard() {
  const [recentCommitments, setRecentCommitments] = useState<Commitment[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    customers: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [commitmentsRes, oppsRes, customersRes] = await Promise.all([
        getCommitments(),
        getOpportunities(),
        getCustomers(),
      ]);

      const commitments = commitmentsRes.data;
      setRecentCommitments(commitments.slice(0, 5));
      setOpportunities(oppsRes.data.slice(0, 3));
      setCustomers(customersRes.data);

      setStats({
        total: commitments.length,
        approved: commitments.filter(c => c.status === 'approved').length,
        pending: commitments.filter(c => c.status === 'pending').length,
        customers: customersRes.data.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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

  return (
    <div>
      <PageHeader
        title="仪表盘"
        description="客户聊天承诺提取系统概览"
        actions={
          <Link to="/import" className="btn-primary flex items-center gap-2">
            <ArrowUpTrayIcon className="w-5 h-5" />
            导入聊天记录
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="承诺总数"
          value={stats.total}
          color="blue"
          icon={<DocumentTextIcon className="w-full h-full" />}
        />
        <StatCard
          title="已批准"
          value={stats.approved}
          color="green"
          icon={<CheckCircleIcon className="w-full h-full" />}
        />
        <StatCard
          title="待审批"
          value={stats.pending}
          color="amber"
          icon={<ClockIcon className="w-full h-full" />}
        />
        <StatCard
          title="客户数量"
          value={stats.customers}
          color="purple"
          icon={<UserGroupIcon className="w-full h-full" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">最近承诺</h2>
              <Link to="/commitments" className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
                查看全部 <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentCommitments.length > 0 ? (
                recentCommitments.map((c, idx) => (
                  <CommitmentCard key={c.id} commitment={c} animationDelay={idx * 50} />
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无承诺记录</p>
                  <Link to="/import" className="text-primary-600 hover:underline mt-2 inline-block">
                    立即导入聊天记录
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">销售机会</h2>
              <Link to="/summary/opportunities" className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
                全部机会 <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {opportunities.map((opp, idx) => (
                <div
                  key={opp.id}
                  className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="font-medium text-slate-800">{opp.name}</div>
                  <div className="text-sm text-slate-500 mt-1">{opp.customer_name}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-slate-400">{opp.commitment_count || 0} 条承诺</span>
                    <span className="text-emerald-600">{opp.approved_count || 0} 条已批准</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <h3 className="font-semibold text-primary-800 mb-2">快速操作</h3>
            <div className="space-y-2">
              <Link to="/import" className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                <ArrowUpTrayIcon className="w-5 h-5 text-primary-600" />
                <span className="text-primary-700">导入新的聊天记录</span>
              </Link>
              <Link to="/approvals" className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                <ClockIcon className="w-5 h-5 text-amber-600" />
                <span className="text-primary-700">处理待审批承诺</span>
              </Link>
              <Link to="/delivery" className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-primary-700">查看交付对接清单</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
