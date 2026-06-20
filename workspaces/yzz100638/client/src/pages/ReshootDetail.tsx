import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, Upload, Check, X, AlertCircle,
  MapPin, Clock, Navigation, FileText, CheckCircle,
} from 'lucide-react';
import { caseApi } from '../api/client';
import type { Case, ReshootItem } from '../types';
import {
  cn,
  formatDateTime,
  copyToClipboard,
} from '../utils';

export default function ReshootDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

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
    } catch (error) {
      console.error('Failed to load case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    if (!id) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setSubmitting(itemId);
      try {
        await caseApi.updateReshoot(id, itemId, {
          photoUrl: dataUrl,
          notes: notes[itemId] || '',
          isCompleted: true,
        });
        loadCase();
      } catch (error) {
        console.error('Failed to upload photo:', error);
      } finally {
        setSubmitting(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMarkComplete = async (itemId: string) => {
    if (!id) return;
    setSubmitting(itemId);
    try {
      await caseApi.updateReshoot(id, itemId, {
        notes: notes[itemId] || '',
        isCompleted: true,
      });
      loadCase();
    } catch (error) {
      console.error('Failed to mark complete:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const handleMarkIncomplete = async (itemId: string) => {
    if (!id) return;
    setSubmitting(itemId);
    try {
      await caseApi.updateReshoot(id, itemId, {
        isCompleted: false,
      });
      loadCase();
    } catch (error) {
      console.error('Failed to mark incomplete:', error);
    } finally {
      setSubmitting(null);
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
          onClick={() => navigate('/reshoot')}
          className="text-primary-600 hover:text-primary-700"
        >
          ← 返回补拍列表
        </button>
      </div>
    );
  }

  const pendingCount = caseData.reshootList.filter(r => !r.isCompleted).length;
  const completedCount = caseData.reshootList.filter(r => r.isCompleted).length;
  const progress = (completedCount / caseData.reshootList.length) * 100;
  const allCompleted = pendingCount === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/reshoot')}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          返回补拍列表
        </button>

        {allCompleted && (
          <button
            onClick={() => navigate(`/cases/${caseData.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-success-600 text-white rounded-xl hover:bg-success-700 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            查看案件详情
          </button>
        )}
      </div>

      {/* Case Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={cn(
          "p-6",
          allCompleted
            ? "bg-gradient-to-r from-success-600 to-success-700"
            : "bg-gradient-to-r from-orange-500 to-orange-600"
        )}
        >
          <div className="flex items-start justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold mb-1">{caseData.plateNumber}</h2>
              <p className="text-white/80 text-sm">
                案件编号: {caseData.id}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-1">
                {completedCount}/{caseData.reshootList.length}
              </div>
              <div className="text-white/80 text-sm">补拍进度</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-white/80">
              <span>{Math.round(progress)}% 完成</span>
              <span>
                {pendingCount > 0 ? `还有 ${pendingCount} 项待补拍` : '全部补拍完成'}
              </span>
            </div>
          </div>
        </div>

        {/* Case Basic Info */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            案件信息
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem icon={Clock} label="事故时间" value={`${caseData.accidentTime.date || '未提取'} ${caseData.accidentTime.time || ''}`} />
            <InfoItem icon={MapPin} label="事故地点" value={caseData.accidentLocation.road || '未提取'} />
            <InfoItem icon={Navigation} label="行驶方向" value={`我方: ${caseData.accidentDirection.ourDirection || '未知'}`} />
            <InfoItem icon={CheckCircle} label="责任判断" value={caseData.liabilityClue.liability} />
          </div>
        </div>

        {/* Standard Description */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-3">标准事故经过</h3>
          <p className="text-gray-700 bg-primary-50 p-4 rounded-xl border border-primary-100">
            {caseData.standardDescription}
          </p>
        </div>
      </div>

      {/* Reshoot List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">补拍清单</h3>

        {caseData.reshootList.map((item, index) => (
          <motion.div
            key={item.id}
            layout
            className={cn(
              "bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all",
              item.isCompleted
                ? "border-success-200"
                : selectedItem === item.id
                ? "border-primary-300 shadow-md"
                : "border-gray-100"
            )}
          >
            {/* Item Header */}
            <div
              className={cn(
                "p-5 cursor-pointer transition-colors",
                selectedItem === item.id && "bg-gray-50"
              )}
              onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  item.isCompleted ? "bg-success-100" : "bg-orange-100"
                )}>
                  {submitting === item.id ? (
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                  ) : item.isCompleted ? (
                    <Check className="w-6 h-6 text-success-600" />
                  ) : (
                    <Camera className="w-6 h-6 text-orange-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-800">
                      {index + 1}. {item.partName || item.shotName}
                    </h4>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2",
                      item.isCompleted
                        ? "bg-success-100 text-success-700"
                        : "bg-orange-100 text-orange-700"
                    )}>
                      {item.isCompleted ? '已完成' : '待补拍'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.reason}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {item.angle && (
                      <span className="flex items-center gap-1">
                        📷 {item.angle}
                      </span>
                    )}
                    {item.description && (
                      <span className="flex items-center gap-1">
                        📝 {item.description}
                      </span>
                    )}
                    {item.completedAt && (
                      <span className="flex items-center gap-1">
                        ⏰ {formatDateTime(item.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
              {selectedItem === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-100"
                >
                  <div className="p-5 bg-gray-50">
                    {/* Photo Preview */}
                    {item.photoUrl && (
                      <div className="mb-4">
                        <img
                          src={item.photoUrl}
                          alt="补拍照片"
                          className="w-full max-w-md mx-auto rounded-xl border-2 border-gray-200"
                        />
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        补拍说明
                      </label>
                      <textarea
                        value={notes[item.id] || item.notes || ''}
                        onChange={(e) => setNotes({
                          ...notes,
                          [item.id]: e.target.value
                        })}
                        placeholder="输入补拍说明..."
                        rows={2}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none resize-none"
                        disabled={item.isCompleted}
                      />
                    </div>

                    {/* Actions */}
                    {item.isCompleted ? (
                      <button
                        onClick={() => handleMarkIncomplete(item.id)}
                        disabled={submitting === item.id}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        标记为待补拍
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className={cn(
                          "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors cursor-pointer",
                          "bg-primary-600 text-white hover:bg-primary-700",
                          submitting === item.id && "opacity-70 cursor-not-allowed"
                        )}>
                          <Upload className="w-5 h-5" />
                          上传补拍照片
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={submitting === item.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(item.id, file);
                              }
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleMarkComplete(item.id)}
                          disabled={submitting === item.id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-success-500 text-success-600 rounded-xl hover:bg-success-50 transition-colors"
                        >
                          <Check className="w-5 h-5" />
                          标记完成（无照片）
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Completion Banner */}
      {allCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-success-500 to-success-600 rounded-2xl p-6 text-white text-center"
        >
          <CheckCircle className="w-16 h-16 mx-auto mb-3" />
          <h3 className="text-2xl font-bold mb-2">🎉 全部补拍完成！</h3>
          <p className="text-white/80 mb-4">
            该案件的所有补拍项目已完成，状态已更新为"补拍完成"
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/reshoot')}
              className="px-6 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors"
            >
              返回补拍列表
            </button>
            <button
              onClick={() => navigate(`/cases/${caseData.id}`)}
              className="px-6 py-2.5 bg-white text-success-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
            >
              查看案件详情
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-medium text-gray-800 text-sm">{value || '-'}</div>
    </div>
  );
}
