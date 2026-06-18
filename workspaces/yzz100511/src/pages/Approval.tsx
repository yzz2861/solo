import { useState } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Weight,
  Footprints,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Download,
  Plus,
  Save,
} from 'lucide-react';
import { useApprovalStore } from '../store/useApprovalStore';
import { useObjectStore } from '../store/useObjectStore';
import { useRiskStore } from '../store/useRiskStore';
import { useMallStore } from '../store/useMallStore';
import { cn } from '../lib/utils';
import { generateRectificationOpinion, generateLoadBasis, generatePassageBasis } from '../utils/riskEngine';
import { calculateLoadPerM2, formatLoad, convertWeightToKg } from '../utils/unitConversion';
import type { ApprovalStatus } from '../types';

export default function Approval() {
  const { approvalRecords, addApprovalRecord, updateApprovalRecord } = useApprovalStore();
  const { objects } = useObjectStore();
  const { risks } = useRiskStore();
  const { config } = useMallStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newApproval, setNewApproval] = useState({
    projectName: '',
    brandName: '',
    applicant: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: '待审批', color: 'text-amber-400 bg-amber-500/20', icon: Clock },
    approved: { label: '已通过', color: 'text-emerald-400 bg-emerald-500/20', icon: CheckCircle2 },
    rejected: { label: '已驳回', color: 'text-red-400 bg-red-500/20', icon: XCircle },
    rectification: { label: '需整改', color: 'text-orange-400 bg-orange-500/20', icon: AlertTriangle },
  };

  const handleCreateApproval = () => {
    if (!newApproval.projectName || !newApproval.brandName) return;

    const rectification = generateRectificationOpinion(risks, objects, config);
    const loadBasis = generateLoadBasis(objects, config);
    const passageBasis = generatePassageBasis(risks, objects, config);

    addApprovalRecord({
      projectName: newApproval.projectName,
      brandName: newApproval.brandName,
      applicant: newApproval.applicant,
      date: newApproval.date,
      status: risks.length > 0 ? 'rectification' : 'pending',
      remarks: newApproval.remarks,
      objects,
      risks,
      loadBasis,
      passageBasis,
      rectificationOpinion: rectification,
    });

    setNewApproval({
      projectName: '',
      brandName: '',
      applicant: '',
      date: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setShowNewForm(false);
  };

  const handleUpdateStatus = (id: string, status: ApprovalStatus, comment?: string) => {
    updateApprovalRecord(id, {
      status,
      approver: '物业管理员',
      approvalDate: new Date().toISOString().split('T')[0],
      approvalComment: comment,
    });
  };

  const totalWeight = objects.reduce((sum, o) => sum + convertWeightToKg(o.weight, o.weightUnit), 0);
  const maxLoad = Math.max(...objects.map((o) => calculateLoadPerM2(o.weight, o.weightUnit, o.area, o.areaUnit)));

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">审批管理</h1>
            <p className="text-slate-400">物业审批记录管理，留存承重和通道的明确依据</p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-5 h-5" />
            新建审批
          </button>
        </div>

        {showNewForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">新建审批记录</h3>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">项目名称 *</label>
                  <input
                    type="text"
                    value={newApproval.projectName}
                    onChange={(e) => setNewApproval({ ...newApproval, projectName: e.target.value })}
                    placeholder="例如：2024春季汽车展览会"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">品牌方 *</label>
                  <input
                    type="text"
                    value={newApproval.brandName}
                    onChange={(e) => setNewApproval({ ...newApproval, brandName: e.target.value })}
                    placeholder="品牌方公司名称"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">申请人</label>
                    <input
                      type="text"
                      value={newApproval.applicant}
                      onChange={(e) => setNewApproval({ ...newApproval, applicant: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">申请日期</label>
                    <input
                      type="date"
                      value={newApproval.date}
                      onChange={(e) => setNewApproval({ ...newApproval, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">备注</label>
                  <textarea
                    value={newApproval.remarks}
                    onChange={(e) => setNewApproval({ ...newApproval, remarks: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">当前布展数据摘要</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">展具数量</p>
                      <p className="text-white font-mono">{objects.length}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">总重量</p>
                      <p className="text-white font-mono">{(totalWeight / 1000).toFixed(1)} 吨</p>
                    </div>
                    <div>
                      <p className="text-slate-400">最大承重</p>
                      <p className={cn('font-mono', maxLoad > config.floorLoadCapacity ? 'text-red-400' : 'text-emerald-400')}>
                        {formatLoad(maxLoad)}
                      </p>
                    </div>
                  </div>
                  {risks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-sm text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        检测到 {risks.length} 项风险，将自动标记为"需整改"
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateApproval}
                  disabled={!newApproval.projectName || !newApproval.brandName}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  创建审批
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-slate-400 text-sm">待审批</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {approvalRecords.filter((r) => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-slate-400 text-sm">需整改</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {approvalRecords.filter((r) => r.status === 'rectification').length}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-slate-400 text-sm">已通过</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {approvalRecords.filter((r) => r.status === 'approved').length}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-slate-400 text-sm">已驳回</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {approvalRecords.filter((r) => r.status === 'rejected').length}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {approvalRecords.length === 0 ? (
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-2">暂无审批记录</p>
              <p className="text-slate-500 text-sm">点击"新建审批"创建第一条审批记录</p>
            </div>
          ) : (
            approvalRecords.map((record) => {
              const StatusIcon = statusConfig[record.status].icon;
              const isExpanded = expandedId === record.id;
              const dangerCount = record.risks.filter((r) => r.severity === 'danger').length;
              const warningCount = record.risks.filter((r) => r.severity === 'warning').length;

              return (
                <div
                  key={record.id}
                  className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden"
                >
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{record.projectName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-slate-400 flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {record.brandName}
                          </span>
                          <span className="text-sm text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {record.date}
                          </span>
                          {record.risks.length > 0 && (
                            <span className="text-sm text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {dangerCount + warningCount} 项风险
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5',
                          statusConfig[record.status].color
                        )}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[record.status].label}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-slate-800">
                      <div className="grid grid-cols-3 gap-6 mt-4">
                        <div className="col-span-2 space-y-4">
                          {record.loadBasis && (
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                <Weight className="w-4 h-4 text-blue-400" />
                                承重计算依据
                              </h4>
                              <div className="text-sm text-slate-300 space-y-2 whitespace-pre-line">
                                {record.loadBasis}
                              </div>
                            </div>
                          )}

                          {record.passageBasis && (
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                <Footprints className="w-4 h-4 text-emerald-400" />
                                通道测量依据
                              </h4>
                              <div className="text-sm text-slate-300 space-y-2 whitespace-pre-line">
                                {record.passageBasis}
                              </div>
                            </div>
                          )}

                          {record.rectificationOpinion && (
                            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                整改意见
                              </h4>
                              <div className="text-sm text-slate-300 space-y-2 whitespace-pre-line">
                                {record.rectificationOpinion}
                              </div>
                            </div>
                          )}

                          {record.approvalComment && (
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-purple-400" />
                                审批意见
                              </h4>
                              <p className="text-sm text-slate-300">{record.approvalComment}</p>
                              {record.approver && record.approvalDate && (
                                <p className="text-xs text-slate-500 mt-2">
                                  {record.approver} 于 {record.approvalDate} 审批
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {record.status === 'pending' || record.status === 'rectification' ? (
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
                              <h4 className="text-sm font-medium text-white">审批操作</h4>
                              <textarea
                                placeholder="输入审批意见..."
                                rows={4}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                                id={`comment-${record.id}`}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const comment = (document.getElementById(`comment-${record.id}`) as HTMLTextAreaElement)?.value;
                                    handleUpdateStatus(record.id, 'approved', comment);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  通过
                                </button>
                                <button
                                  onClick={() => {
                                    const comment = (document.getElementById(`comment-${record.id}`) as HTMLTextAreaElement)?.value;
                                    handleUpdateStatus(record.id, 'rejected', comment);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  驳回
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                              <h4 className="text-sm font-medium text-white mb-3">展具清单</h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {record.objects.map((obj) => {
                                  const loadPerM2 = calculateLoadPerM2(obj.weight, obj.weightUnit, obj.area, obj.areaUnit);
                                  return (
                                    <div
                                      key={obj.id}
                                      className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg"
                                    >
                                      <span className="text-sm text-white">{obj.name}</span>
                                      <span
                                        className={cn(
                                          'text-xs font-mono',
                                          loadPerM2 > config.floorLoadCapacity ? 'text-red-400' : 'text-emerald-400'
                                        )}
                                      >
                                        {formatLoad(loadPerM2)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <h4 className="text-sm font-medium text-white mb-3">导出记录</h4>
                            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                              导出审批单 (PDF)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
