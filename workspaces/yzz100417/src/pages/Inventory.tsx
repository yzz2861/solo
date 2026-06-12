import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment, AttachmentModel, Location } from '../../shared/types';

type TabType = 'attachments' | 'batches';

interface BatchInfo {
  batch_no: string;
  total: number;
  available_count: number;
  bound_count: number;
  recalled_count: number;
  earliest_expiry: string | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    available: 'bg-success-50 text-success-600',
    bound: 'bg-medical-50 text-medical-600',
    recalled: 'bg-danger-50 text-danger-600',
    expired: 'bg-neutral-100 text-neutral-600',
  };
  const label: Record<string, string> = {
    available: '可用',
    bound: '已绑定',
    recalled: '已召回',
    expired: '已过期',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      map[status] || 'bg-neutral-100 text-neutral-600'
    )}>
      {label[status] || status}
    </span>
  );
};

const typeLabel: Record<string, string> = {
  template: '模板',
  material: '材料',
  aligner_batch: '牙套批次',
};

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<TabType>('attachments');
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [models, setModels] = useState<AttachmentModel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);

  const [inboundForm, setInboundForm] = useState({
    attachmentModelId: '',
    batchNo: '',
    quantity: 1,
    locationId: '',
    expiryDate: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    delta: 1,
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mRes, lRes, aRes, bRes] = await Promise.all([
        fetch('/api/models').then(r => r.json()),
        fetch('/api/locations').then(r => r.json()),
        fetch('/api/attachments').then(r => r.json()),
        fetch('/api/batches').then(r => r.json()),
      ]);
      if (mRes.success) setModels(mRes.data);
      if (lRes.success) setLocations(lRes.data);
      if (aRes.success) setAttachments(aRes.data);
      if (bRes.success) setBatches(bRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInbound = async () => {
    if (!inboundForm.attachmentModelId || !inboundForm.batchNo || !inboundForm.quantity || !inboundForm.locationId) {
      showToast('error', '请填写完整入库信息');
      return;
    }
    setLoading(true);
    fetch('/api/inventory/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inboundForm),
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showToast('success', `成功入库 ${res.data.count} 件附件`);
          setShowInboundModal(false);
          setInboundForm({ attachmentModelId: '', batchNo: '', quantity: 1, locationId: '', expiryDate: '' });
          loadData();
        } else {
          showToast('error', res.error || '入库失败');
        }
      })
      .finally(() => setLoading(false));
  };

  const handleAdjust = async () => {
    if (!selectedAttachment || !adjustForm.reason) {
      showToast('error', '请选择附件并填写调整原因');
      return;
    }
    setLoading(true);
    fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachmentId: selectedAttachment.id, delta: adjustForm.delta, reason: adjustForm.reason }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showToast('success', '调整成功');
          setShowAdjustModal(false);
          setSelectedAttachment(null);
          setAdjustForm({ delta: 1, reason: '' });
          loadData();
        } else {
          showToast('error', res.error || '调整失败');
        }
      })
      .finally(() => setLoading(false));
  };

  const handleRecall = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    fetch(`/api/batches/${encodeURIComponent(selectedBatch)}/recall`, { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showToast('success', `批次 ${selectedBatch} 已召回，影响 ${res.data.affectedPatients?.length || 0} 位患者`);
          setShowRecallModal(false);
          setSelectedBatch(null);
          loadData();
        } else {
          showToast('error', res.error || '召回失败');
        }
      })
      .finally(() => setLoading(false));
  };

  const filteredAttachments = attachments.filter(a => {
    const matchesSearch = !searchQuery ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.batch_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.model?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-popover flex items-center gap-2 animate-slide-down',
          toast.type === 'success' ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
        )}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-medical-600" />
              库存管理
            </h1>
            <p className="text-sm text-neutral-500 mt-1">管理附件入库、调整与批次召回</p>
          </div>
          <button
            onClick={() => setShowInboundModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium shadow-card"
          >
            <Plus className="w-4 h-4" />
            新批次入库
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-neutral-200 overflow-hidden">
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => setActiveTab('attachments')}
              className={cn(
                'flex-1 px-6 py-4 text-sm font-medium transition-colors',
                activeTab === 'attachments'
                  ? 'text-medical-600 border-b-2 border-medical-600 bg-medical-50'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              )}
            >
              附件列表
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={cn(
                'flex-1 px-6 py-4 text-sm font-medium transition-colors',
                activeTab === 'batches'
                  ? 'text-medical-600 border-b-2 border-medical-600 bg-medical-50'
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              )}
            >
              批次管理
            </button>
          </div>

          {activeTab === 'attachments' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 border-b border-neutral-200">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="搜索条码 / 批次 / 型号..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 bg-white"
                >
                  <option value="all">全部状态</option>
                  <option value="available">可用</option>
                  <option value="bound">已绑定</option>
                  <option value="recalled">已召回</option>
                  <option value="expired">已过期</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">条码</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">型号</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">批次</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">位置</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">效期</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredAttachments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                        暂无附件数据</td>
                      </tr>
                    ) : (
                      filteredAttachments.map(a => (
                      <tr key={a.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-neutral-700 bg-neutral-100 px-2 py-1 rounded">
                            {a.code}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700">{a.model?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-neutral-500">
                            {a.model?.type ? typeLabel[a.model.type] || a.model.type : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{a.batch_no}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {a.location
                            ? `${a.location.clinic_room}-${a.location.shelf}-${a.location.slot}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{a.expiry_date || '-'}</td>
                        <td className="px-6 py-4">{statusBadge(a.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative">
                            <button
                            onClick={() => {
                              setSelectedAttachment(a);
                              setShowAdjustModal(true);
                            }}
                            disabled={a.status !== 'available'}
                            className={cn(
                              'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              a.status === 'available'
                                ? 'text-medical-600 hover:bg-medical-50'
                                : 'text-neutral-300 cursor-not-allowed'
                            )}
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            调整
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">批次号</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">总数</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">可用</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">已绑定</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">已召回</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">最早效期</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">暂无批次数据</td>
                    </tr>
                  ) : (
                    batches.map(b => (
                    <tr key={b.batch_no} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono font-semibold text-neutral-800 bg-neutral-100 px-2 py-1 rounded">
                          {b.batch_no}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-neutral-700">{b.total}</td>
                      <td className="px-6 py-4 text-sm text-success-600 font-medium">{b.available_count}</td>
                      <td className="px-6 py-4 text-sm text-medical-600 font-medium">{b.bound_count}</td>
                      <td className="px-6 py-4 text-sm text-danger-600 font-medium">{b.recalled_count}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{b.earliest_expiry || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                        onClick={() => {
                          setSelectedBatch(b.batch_no);
                          setShowRecallModal(true);
                        }}
                        disabled={b.available_count === 0 && b.bound_count === 0}
                        className={cn(
                          'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          b.available_count === 0 && b.bound_count === 0
                            ? 'text-neutral-300 cursor-not-allowed'
                            : 'text-danger-600 hover:bg-danger-50'
                        )}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        召回
                      </button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showInboundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-popover w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-medical-600" />
                新批次入库
              </h3>
              <button onClick={() => setShowInboundModal(false)} className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">附件型号 <span className="text-danger-500">*</span></label>
                <select
                  value={inboundForm.attachmentModelId}
                  onChange={e => setInboundForm({ ...inboundForm, attachmentModelId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 bg-white"
                >
                  <option value="">请选择型号</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({typeLabel[m.type] || m.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">批次号 <span className="text-danger-500">*</span></label>
                <input
                  type="text"
                  value={inboundForm.batchNo}
                  onChange={e => setInboundForm({ ...inboundForm, batchNo: e.target.value })}
                  placeholder="如 BATCH20250101"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">入库数量 <span className="text-danger-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={inboundForm.quantity}
                    onChange={e => setInboundForm({ ...inboundForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">存放位置 <span className="text-danger-500">*</span></label>
                  <select
                    value={inboundForm.locationId}
                    onChange={e => setInboundForm({ ...inboundForm, locationId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 bg-white"
                  >
                    <option value="">选择位置</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.clinic_room}-{l.shelf}-{l.slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">有效期</label>
                <input
                  type="date"
                  value={inboundForm.expiryDate}
                  onChange={e => setInboundForm({ ...inboundForm, expiryDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
              <button
                onClick={() => setShowInboundModal(false)}
                className="flex-1 px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleInbound}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认入库'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && selectedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-popover w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-medical-600" />
                调整库存
              </h3>
              <button onClick={() => { setShowAdjustModal(false); setSelectedAttachment(null); }} className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <div className="text-xs text-neutral-500 mb-2">选中附件</div>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-neutral-200">
                    {selectedAttachment.code}
                  </code>
                  <span className="text-sm text-neutral-600">{selectedAttachment.model?.name}</span>
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  批次: {selectedAttachment.batch_no}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">调整数量 <span className="text-danger-500">*</span></label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustForm({ ...adjustForm, delta: adjustForm.delta - 1 })}
                    className="px-3 py-2.5 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={adjustForm.delta}
                    onChange={e => setAdjustForm({ ...adjustForm, delta: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                  <button
                    onClick={() => setAdjustForm({ ...adjustForm, delta: adjustForm.delta + 1 })}
                    className="px-3 py-2.5 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {adjustForm.delta > 0 ? '将增加库存' : adjustForm.delta < 0 ? '将减少库存' : '无变化'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">调整原因 <span className="text-danger-500">*</span></label>
                <textarea
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="如：盘点差异、损坏报损、样品领用等"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
              <button
                onClick={() => { setShowAdjustModal(false); setSelectedAttachment(null); }}
                className="flex-1 px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAdjust}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecallModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-popover w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-danger-100 bg-danger-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-danger-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                确认批次召回
              </h3>
              <button onClick={() => { setShowRecallModal(false); setSelectedBatch(null); }} className="p-1 rounded-lg hover:bg-danger-100 text-danger-400 hover:text-danger-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                <div className="text-sm text-danger-800 font-medium mb-2">
                  即将召回批次：
                </div>
                <code className="text-lg font-mono font-bold text-danger-900 bg-white px-3 py-1.5 rounded border border-danger-200 inline-block">
                  {selectedBatch}
                </code>
              </div>
              <div className="space-y-2 text-sm text-neutral-600">
                <p className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                  <span>该批次下所有附件将被标记为「已召回」状态</span>
                </p>
                <p className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                  <span>已绑定给患者的附件也将无法继续使用</span>
                </p>
                <p className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                  <span>系统将列出受影响患者，请及时通知更换</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
              <button
                onClick={() => { setShowRecallModal(false); setSelectedBatch(null); }}
                className="flex-1 px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleRecall}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认召回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
