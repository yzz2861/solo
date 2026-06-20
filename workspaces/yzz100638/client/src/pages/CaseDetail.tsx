import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Camera,
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  MapPin,
  Clock,
  Navigation,
  Car,
  Shield,
  Check,
  X,
  Edit,
  Plus,
  AlertCircle,
  Upload,
  Eye,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { caseApi } from '../api/client';
import type { Case, ReshootItem, VehiclePart } from '../types';
import {
  cn,
  formatDateTime,
  getConfidenceColor,
  getConfidenceLabel,
  getConfidenceBgColor,
  getStatusLabel,
  getStatusColor,
  copyToClipboard,
  downloadFile,
} from '../utils';

const zoneColors: Record<string, string> = {
  front: '#3b82f6',
  rear: '#10b981',
  left: '#f59e0b',
  right: '#ef4444',
  roof: '#8b5cf6',
  interior: '#ec4899',
  chassis: '#6b7280',
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'parts' | 'reshoot' | 'export'>('overview');
  const [confirmModal, setConfirmModal] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [confirmedParts, setConfirmedParts] = useState<{ id: string; name: string; damage: string }[]>([]);
  const [confirmedLiability, setConfirmedLiability] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDamage, setSelectedDamage] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadCase();
    }
  }, [id]);

  const loadCase = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await caseApi.get(id);
      setCaseData(response.data);
      setConfirmedLiability(response.data.liabilityClue.liability);
      const initialDamage: Record<string, string> = {};
      response.data.vehicleParts.forEach((p: VehiclePart) => {
        initialDamage[p.id] = p.damage || '剐蹭';
      });
      setSelectedDamage(initialDamage);
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) return;

    const parts = caseData?.vehicleParts.map(p => ({
      id: p.id,
      name: p.name,
      damage: selectedDamage[p.id] || '剐蹭',
    })) || [];

    try {
      await caseApi.confirm(id, {
        confirmedParts: parts,
        confirmedLiability,
        notes,
      });
      loadCase();
      setConfirmModal(false);
    } catch (error) {
      console.error('Failed to confirm case:', error);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const response = await caseApi.export(id);
      setExportData(response.data);
      setActiveTab('export');
    } catch (error) {
      console.error('Failed to export case:', error);
    }
  };

  const handleCopySummary = async () => {
    if (exportData?.summaryText) {
      await copyToClipboard(exportData.summaryText);
      alert('已复制到剪贴板');
    }
  };

  const handleDownloadSummary = () => {
    if (exportData?.summaryText && caseData) {
      const content = `案件编号: ${caseData.id}
车牌号: ${caseData.plateNumber}
创建时间: ${formatDateTime(caseData.createdAt)}

${exportData.summaryText}

---
系统粘贴摘要
`;
      downloadFile(content, `${caseData.plateNumber}_案件摘要.txt`, 'text/plain');
    }
  };

  const handleDownloadReshootList = () => {
    if (exportData?.reshootList && caseData) {
      const content = exportData.reshootList.map((item: ReshootItem, index: number) =>
        `${index + 1}. ${item.partName || item.shotName}
   原因: ${item.reason}
   ${item.angle ? `拍摄角度: ${item.angle}` : ''}
   ${item.description ? `描述: ${item.description}` : ''}
   状态: ${item.isCompleted ? '已完成' : '待补拍'}
`
      ).join('\n');

      downloadFile(
        `补拍清单 - ${caseData.plateNumber}\n\n${content}`,
        `${caseData.plateNumber}_补拍清单.txt`,
        'text/plain'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">案件不存在</h3>
        <button
          onClick={() => navigate('/cases')}
          className="text-primary-600 hover:text-primary-700"
        >
          ← 返回案件列表
        </button>
      </div>
    );
  }

  const confidenceData = [
    { name: '置信度', value: caseData.confidenceScore * 100 },
    { name: '扣分项', value: (1 - caseData.confidenceScore) * 100 },
  ];

  const deductionData = caseData.lowConfidenceFlags.map((flag, i) => ({
    name: flag.type,
    value: Math.abs(parseFloat(flag.details?.deduction || '0.1')) * 100,
  }));

  const zoneGroups = caseData.vehicleParts.reduce((acc, part) => {
    if (!acc[part.zone]) {
      acc[part.zone] = [];
    }
    acc[part.zone].push(part);
    return acc;
  }, {} as Record<string, VehiclePart[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/cases')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          返回案件列表
        </button>

        <div className="flex items-center gap-3">
          {caseData.status === 'draft' && (
            <>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-primary-500 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                导出
              </button>
              <button
                onClick={() => setConfirmModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                确认案件
              </button>
            </>
          )}
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{caseData.plateNumber}</h2>
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  getStatusColor(caseData.status).replace('bg-', 'bg-white/20 text-white border border-white/30')
                )}>
                  {getStatusLabel(caseData.status)}
                </span>
              </div>
              <p className="text-primary-100">
                案件编号: {caseData.id} · 创建于 {formatDateTime(caseData.createdAt)}
              </p>
            </div>

            {/* Confidence Gauge */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={confidenceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill={caseData.confidenceScore >= 0.7 ? '#10b981' : caseData.confidenceScore >= 0.5 ? '#eab308' : '#ef4444'} />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {Math.round(caseData.confidenceScore * 100)}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {getConfidenceLabel(caseData.confidenceScore)}
                </div>
                <div className="text-sm text-primary-200">
                  {caseData.lowConfidenceFlags.length} 项待优化
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Standard Description */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-800">标准事故经过</h3>
          </div>
          <p className="text-gray-700 leading-relaxed bg-primary-50 p-4 rounded-xl border border-primary-100">
            {caseData.standardDescription}
          </p>
        </div>

        {/* Key Info Cards */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard
            icon={Clock}
            label="事故时间"
            value={`${caseData.accidentTime.date || '未提取'} ${caseData.accidentTime.time || ''}`}
            isVague={caseData.accidentTime.isVague}
          />
          <InfoCard
            icon={MapPin}
            label="事故地点"
            value={caseData.accidentLocation.road || '未提取'}
            isVague={caseData.accidentLocation.isVague}
          />
          <InfoCard
            icon={Navigation}
            label="行驶方向"
            value={`我方: ${caseData.accidentDirection.ourDirection || '未知'}`}
            isVague={caseData.accidentDirection.isVague}
          />
          <InfoCard
            icon={Shield}
            label="责任判断"
            value={caseData.liabilityClue.liability}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'overview', label: '概览', icon: FileText },
            { key: 'parts', label: '损失部位', icon: Car },
            { key: 'reshoot', label: '补拍清单', icon: Camera },
            { key: 'export', label: '导出', icon: Download },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                activeTab === tab.key
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'reshoot' && caseData.reshootList.length > 0 && (
                <span className="bg-accent-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {caseData.reshootList.filter(r => !r.isCompleted).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Low Confidence Flags */}
                {caseData.lowConfidenceFlags.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning-500" />
                      低置信标记 ({caseData.lowConfidenceFlags.length})
                    </h4>
                    <div className="space-y-2">
                      {caseData.lowConfidenceFlags.map((flag, i) => (
                        <div key={i} className={cn(
                          "p-4 rounded-xl border",
                          flag.severity === 'high' ? "bg-danger-50 border-danger-200" :
                          flag.severity === 'medium' ? "bg-warning-50 border-warning-200" :
                          "bg-gray-50 border-gray-200"
                        )}>
                          <div className="flex items-start gap-3">
                            <AlertCircle className={cn(
                              "w-5 h-5 mt-0.5",
                              flag.severity === 'high' ? "text-danger-500" :
                              flag.severity === 'medium' ? "text-warning-500" :
                              "text-gray-500"
                            )} />
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">{flag.message}</div>
                              <div className="text-sm text-gray-600 mt-1">{flag.suggestion}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deduction Chart */}
                {deductionData.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">扣分详情</h4>
                    <div className="h-48">
                      <ResponsiveContainer>
                        <BarChart data={deductionData} layout="vertical">
                          <XAxis type="number" domain={[0, 30]} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip formatter={(value) => [`${value}%`, '扣分']} />
                          <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Liability Clue */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <h4 className="font-semibold text-gray-800 mb-2">责任线索</h4>
                  <p className="text-gray-700">{caseData.liabilityClue.clue}</p>
                  {caseData.liabilityClue.evidence.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-500 mb-2">证据依据:</div>
                      <div className="flex flex-wrap gap-2">
                        {caseData.liabilityClue.evidence.map((ev, i) => (
                          <span key={i} className="px-2 py-1 bg-white rounded-lg text-sm text-gray-600">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Missing Materials */}
                {caseData.missingMaterials.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      缺材料提醒 ({caseData.missingMaterials.length})
                    </h4>
                    <div className="space-y-2">
                      {caseData.missingMaterials.map((mat, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg">
                          <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <div className="font-medium text-gray-800">{mat.name}</div>
                            <div className="text-sm text-gray-600">{mat.description}</div>
                            <div className="text-xs text-orange-600 mt-1">{mat.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'parts' && (
              <motion.div
                key="parts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Vehicle Parts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(zoneGroups).map(([zone, parts]) => (
                    <div key={zone} className="bg-gray-50 rounded-xl p-5">
                      <h4
                        className="font-semibold text-gray-800 mb-3 flex items-center gap-2"
                        style={{ color: zoneColors[zone] }}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zoneColors[zone] }}
                        ></span>
                        {parts[0]?.zoneName}区域 ({parts.length})
                      </h4>
                      <div className="space-y-2">
                        {parts.map((part) => (
                          <div
                            key={part.id}
                            className={cn(
                              "p-3 rounded-lg border-2",
                              part.isEstimated
                                ? "border-dashed border-warning-300 bg-warning-50"
                                : "border-solid border-gray-200 bg-white"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800">
                                {part.name}
                                {part.isEstimated && (
                                  <span className="ml-2 text-xs text-warning-600">(推测)</span>
                                )}
                              </span>
                              {caseData.status === 'draft' && (
                                <select
                                  value={selectedDamage[part.id] || '剐蹭'}
                                  onChange={(e) => setSelectedDamage({
                                    ...selectedDamage,
                                    [part.id]: e.target.value
                                  })}
                                  className="text-sm px-2 py-1 border border-gray-200 rounded"
                                >
                                  <option value="剐蹭">剐蹭</option>
                                  <option value="凹陷">凹陷</option>
                                  <option value="掉漆">掉漆</option>
                                  <option value="变形">变形</option>
                                  <option value="碎裂">碎裂</option>
                                </select>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              来源: {part.source === 'description' ? '文字描述' : '照片备注'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Liability Confirmation */}
                {caseData.status === 'draft' && (
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <h4 className="font-semibold text-gray-800 mb-3">责任确认</h4>
                    <select
                      value={confirmedLiability}
                      onChange={(e) => setConfirmedLiability(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none bg-white"
                    >
                      <option value="对方全责">对方全责</option>
                      <option value="我方全责">我方全责</option>
                      <option value="同等责任">同等责任</option>
                      <option value="主次责任">主次责任</option>
                      <option value="无法判定">无法判定</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                {caseData.status === 'draft' && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">备注说明</h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="输入补充说明..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none resize-none"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reshoot' && (
              <motion.div
                key="reshoot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {caseData.reshootList.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success-300" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">无需补拍</h3>
                    <p className="text-gray-500">该案件没有需要补拍的照片</p>
                  </div>
                ) : (
                  <>
                    {caseData.reshootList.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          item.isCompleted
                            ? "bg-success-50 border-success-200"
                            : "bg-orange-50 border-orange-200"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            item.isCompleted ? "bg-success-200" : "bg-orange-200"
                          )}>
                            {item.isCompleted ? (
                              <Check className="w-6 h-6 text-success-700" />
                            ) : (
                              <Camera className="w-6 h-6 text-orange-700" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-semibold text-gray-800">
                                {index + 1}. {item.partName || item.shotName}
                              </h5>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                item.isCompleted
                                  ? "bg-success-200 text-success-700"
                                  : "bg-orange-200 text-orange-700"
                              )}>
                                {item.isCompleted ? '已补拍' : '待补拍'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                            {item.angle && (
                              <p className="text-xs text-gray-500 mt-2">
                                📷 建议角度: {item.angle}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                📝 说明: {item.description}
                              </p>
                            )}
                            {item.isCompleted && item.photoUrl && (
                              <div className="mt-3">
                                <img
                                  src={item.photoUrl}
                                  alt="补拍照片"
                                  className="w-32 h-24 object-cover rounded-lg"
                                />
                              </div>
                            )}
                            {!item.isCompleted && (
                              <button
                                onClick={() => navigate(`/reshoot/${caseData.id}`)}
                                className="mt-3 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                              >
                                去补拍
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'export' && (
              <motion.div
                key="export"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {!exportData ? (
                  <div className="text-center py-12">
                    <Download className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">未生成导出数据</h3>
                    <p className="text-gray-500 mb-4">点击右上角导出按钮生成可粘贴摘要</p>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      生成导出数据
                    </button>
                  </div>
                ) : (
                  <>
                    {/* System Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">系统可粘贴摘要</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCopySummary}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                          >
                            <Copy className="w-4 h-4" />
                            复制
                          </button>
                          <button
                            onClick={handleDownloadSummary}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                            下载
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-sm whitespace-pre-wrap">
                        {exportData.summaryText}
                      </div>
                    </div>

                    {/* Reshoot List */}
                    {exportData.reshootList.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">补拍清单</h4>
                          <button
                            onClick={handleDownloadReshootList}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                            下载清单
                          </button>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                          <div className="space-y-3">
                            {exportData.reshootList.map((item: ReshootItem, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm font-bold flex-shrink-0">
                                  {i + 1}
                                </span>
                                <div>
                                  <div className="font-medium text-gray-800">
                                    {item.partName || item.shotName}
                                  </div>
                                  <div className="text-sm text-gray-600">{item.reason}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Missing Materials */}
                    {exportData.missingMaterials.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">缺材料清单</h4>
                        <div className="bg-danger-50 rounded-xl p-5 border border-danger-200">
                          <div className="space-y-2">
                            {exportData.missingMaterials.map((mat: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-2">
                                <AlertCircle className="w-5 h-5 text-danger-500 mt-0.5" />
                                <div>
                                  <span className="font-medium text-gray-800">{mat.name}</span>
                                  <span className="text-gray-600"> - {mat.reason}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
                      导出时间: {formatDateTime(exportData.exportTime)}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-2">确认案件</h3>
            <p className="text-gray-600 mb-6">
              确认后案件将标记为已确认，无法再修改。请核对所有信息无误后再确认。
            </p>

            <div className="bg-primary-50 rounded-xl p-4 mb-6">
              <div className="text-sm text-gray-500 mb-2">已确认的损失部位:</div>
              <div className="flex flex-wrap gap-2">
                {caseData.vehicleParts.map(p => (
                  <span key={p.id} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                    {p.name} ({selectedDamage[p.id] || '剐蹭'})
                  </span>
                ))}
              </div>
              <div className="text-sm text-gray-500 mt-4 mb-2">已确认的责任:</div>
              <div className="font-medium text-gray-800">{confirmedLiability}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
              >
                确认提交
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  isVague = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  isVague?: boolean;
}) {
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isVague ? "bg-warning-50 border-warning-200" : "bg-gray-50 border-gray-100"
    )}>
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="font-semibold text-gray-800">{value || '-'}</div>
      {isVague && (
        <div className="text-xs text-warning-600 mt-1">信息模糊，请核对</div>
      )}
    </div>
  );
}
