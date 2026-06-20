import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import { getCommitmentDetail, updateCommitment, approveCommitment, rejectCommitment, needsRevision } from '../api';
import type { CommitmentDetail } from '../types';
import {
  getTypeLabel,
  getTypeColor,
  getConfidenceLevel,
  getConfidenceBgColor,
  getStatusLabel,
  formatDateTime,
} from '../utils';

export default function CommitmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CommitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('');
  const [editContractRef, setEditContractRef] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'approvals'>('info');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const loadDetail = async () => {
    try {
      const res = await getCommitmentDetail(Number(id));
      setDetail(res.data);
    } catch (error) {
      console.error('Failed to load detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!detail) return;
    setEditContent(detail.commitment.content);
    setEditType(detail.commitment.type);
    setEditContractRef(detail.commitment.contract_reference || '');
    setEditNotes(detail.commitment.notes || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!detail || !editContent.trim()) return;
    setActionLoading(true);
    try {
      await updateCommitment(detail.commitment.id, {
        content: editContent,
        type: editType as any,
        contract_reference: editContractRef || undefined,
        notes: editNotes || undefined,
      });
      await loadDetail();
      setEditing(false);
    } catch (error) {
      console.error('Update failed:', error);
      alert('保存失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await approveCommitment(detail.commitment.id);
      await loadDetail();
    } catch (error) {
      console.error('Approve failed:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await rejectCommitment(detail.commitment.id);
      await loadDetail();
    } catch (error) {
      console.error('Reject failed:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNeedsRevision = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await needsRevision(detail.commitment.id);
      await loadDetail();
    } catch (error) {
      console.error('Needs revision failed:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500">承诺记录不存在</p>
        <Link to="/commitments" className="text-primary-600 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const { commitment, versions, approvals } = detail;
  const confidenceLevel = getConfidenceLevel(commitment.confidence);

  const types = [
    { value: 'price', label: '报价折扣' },
    { value: 'gift', label: '赠品' },
    { value: 'delivery', label: '交付时间' },
    { value: 'aftersales', label: '售后承诺' },
    { value: 'condition', label: '待确认条件' },
  ];

  return (
    <div>
      <PageHeader
        title="承诺详情"
        actions={
          <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            返回
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`card p-6 confidence-${confidenceLevel}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${getTypeColor(commitment.type)}`}>
                  {getTypeLabel(commitment.type)}
                </span>
                <span className={`badge ${getConfidenceBgColor(commitment.confidence)}`}>
                  置信度 {(commitment.confidence * 100).toFixed(0)}%
                </span>
                <span className={`badge status-${commitment.status}`}>
                  {getStatusLabel(commitment.status)}
                </span>
              </div>
              {!editing && (
                <button onClick={startEdit} className="btn-secondary flex items-center gap-2">
                  <PencilSquareIcon className="w-4 h-4" />
                  编辑
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="label">承诺内容</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">承诺类型</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value)} className="input">
                    {types.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">合同引用</label>
                  <input
                    type="text"
                    value={editContractRef}
                    onChange={(e) => setEditContractRef(e.target.value)}
                    placeholder="如：合同第3条第2款"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">备注</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    placeholder="修改说明..."
                    className="input"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={saveEdit} disabled={actionLoading} className="btn-primary">
                    {actionLoading ? '保存中...' : '保存修改'}
                  </button>
                  <button onClick={cancelEdit} className="btn-secondary">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm text-slate-500 mb-1">承诺内容</h3>
                  <p className="text-lg font-medium text-slate-800">{commitment.content}</p>
                </div>

                <div>
                  <h3 className="text-sm text-slate-500 mb-1">原始聊天记录</h3>
                  <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-primary-500">
                    <p className="text-slate-700 italic">「{commitment.original_sentence}」</p>
                  </div>
                </div>

                {commitment.confidence_reason && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-amber-700 flex items-center gap-2">
                      <span>⚠️</span>
                      {commitment.confidence_reason}
                    </p>
                  </div>
                )}

                {commitment.contract_reference && (
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <p className="text-primary-700 flex items-center gap-2">
                      <DocumentDuplicateIcon className="w-5 h-5" />
                      合同引用：{commitment.contract_reference}
                    </p>
                  </div>
                )}

                {commitment.notes && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-slate-600">
                      <span className="font-medium">备注：</span>{commitment.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!editing && commitment.status === 'pending' && (
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200">
                <button onClick={handleApprove} disabled={actionLoading} className="btn-ghost-emerald flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  批准
                </button>
                <button onClick={handleReject} disabled={actionLoading} className="btn-ghost-red flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4" />
                  驳回
                </button>
                <button onClick={handleNeedsRevision} disabled={actionLoading} className="btn-ghost-amber flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4" />
                  需修改
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center border-b border-slate-200">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'info' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                基本信息
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                修改历史 ({versions.length})
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'approvals' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                审批记录 ({approvals.length})
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">发送人</p>
                      <p className="font-medium text-slate-700">{commitment.sender}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">创建时间</p>
                      <p className="font-medium text-slate-700">{formatDateTime(commitment.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">消息时间</p>
                      <p className="font-medium text-slate-700">{formatDateTime(commitment.message_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <DocumentDuplicateIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">消息来源</p>
                      <p className="font-medium text-slate-700">{commitment.source || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {versions.length > 0 ? (
                    versions.map((v, idx) => (
                      <div key={v.id} className="p-4 bg-slate-50 rounded-lg border-l-4 border-slate-300">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">版本 {versions.length - idx}</span>
                          <span className="text-xs text-slate-400">{formatDateTime(v.created_at)}</span>
                        </div>
                        <p className="text-slate-600 text-sm mb-2">{v.content}</p>
                        {v.change_reason && (
                          <p className="text-xs text-slate-500">修改原因：{v.change_reason}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">暂无修改历史</p>
                  )}
                </div>
              )}

              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  {approvals.length > 0 ? (
                    approvals.map((a) => (
                      <div
                        key={a.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          a.action === 'approve' ? 'bg-emerald-50 border-emerald-400' :
                          a.action === 'reject' ? 'bg-red-50 border-red-400' :
                          'bg-amber-50 border-amber-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${
                            a.action === 'approve' ? 'text-emerald-700' :
                            a.action === 'reject' ? 'text-red-700' :
                            'text-amber-700'
                          }`}>
                            {a.action === 'approve' ? '批准' : a.action === 'reject' ? '驳回' : '需修改'}
                          </span>
                          <span className="text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
                        </div>
                        {a.comments && (
                          <p className="text-sm text-slate-600">{a.comments}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">暂无审批记录</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">关联信息</h3>
            <div className="space-y-4">
              {commitment.customer_name && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">客户</p>
                  <p className="font-medium text-slate-700">{commitment.customer_name}</p>
                </div>
              )}
              {commitment.opportunity_name && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">销售机会</p>
                  <p className="font-medium text-slate-700">{commitment.opportunity_name}</p>
                </div>
              )}
              {commitment.salesperson && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">销售人员</p>
                  <p className="font-medium text-slate-700">{commitment.salesperson}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <h3 className="font-semibold text-primary-800 mb-3">置信度说明</h3>
            <div className="space-y-2 text-sm text-primary-700">
              <p>• 高置信度：≥80%，表述明确</p>
              <p>• 中置信度：50%-80%，部分不确定</p>
              <p>• 低置信度：&lt;50%，含不确定表述</p>
            </div>
            <div className="mt-4 pt-4 border-t border-primary-200">
              <p className="text-xs text-primary-600">
                当前置信度：{(commitment.confidence * 100).toFixed(0)}%
                <span className={`ml-2 ${confidenceLevel === 'high' ? 'text-emerald-600' : confidenceLevel === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                  ({confidenceLevel === 'high' ? '高' : confidenceLevel === 'medium' ? '中' : '低'})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
