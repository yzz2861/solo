import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Flag,
  Send,
  RotateCcw,
  CheckCircle,
  FileText,
  User,
  Phone,
  MapPin,
  Clock,
  History,
  GripVertical,
} from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import PhotoViewer from "@/components/PhotoViewer/PhotoViewer";
import TagBadge from "@/components/TagBadge/TagBadge";
import ConfidenceBar from "@/components/ConfidenceBar/ConfidenceBar";
import StatusBadge from "@/components/StatusBadge/StatusBadge";
import AuditTimeline from "@/components/AuditTimeline/AuditTimeline";
import type { DefectType } from "@/types";
import { DEFECT_TYPE_CONFIG } from "@/utils/constants";
import { desensitizePhone, desensitizeName, desensitizeAddress } from "@/utils/desensitize";

export default function CustomerReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrderById, addTag, removeTag, updateOrderStatus, markAsDisputed } = useOrderStore();

  const order = id ? getOrderById(id) : undefined;

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedTagType, setSelectedTagType] = useState<DefectType | null>(null);
  const [showAddTag, setShowAddTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editConfidence, setEditConfidence] = useState(80);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">工单不存在</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
        >
          返回列表
        </button>
      </div>
    );
  }

  const currentPhoto = order.photos[selectedPhotoIndex];

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const handleAddTag = (type: DefectType) => {
    addTag(order.id, type, "客服小王");
    setShowAddTag(false);
    showToast("标签已添加");
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag(order.id, tagId, "客服小王");
    showToast("标签已删除");
  };

  const handleStartEdit = (tagId: string, confidence: number) => {
    setEditingTagId(tagId);
    setEditConfidence(confidence);
  };

  const handleSaveEdit = (tagId: string) => {
    // 使用 store 中的 updateTagConfidence 方法
    const { updateTagConfidence } = useOrderStore.getState();
    updateTagConfidence(order.id, tagId, editConfidence, "客服小王");
    setEditingTagId(null);
    showToast("置信度已调整");
  };

  const handleSubmitQuality = () => {
    updateOrderStatus(order.id, "quality_check", "客服小王", "提交质检复核");
    showToast("已提交质检");
  };

  const handleCloseOrder = () => {
    updateOrderStatus(order.id, "closed", "客服小王", "客服审核通过，直接结案");
    showToast("工单已结案");
  };

  const handleMarkDisputed = () => {
    markAsDisputed(order.id, "客服小王", disputeReason || "客服标记为争议件");
    setShowDisputeModal(false);
    setDisputeReason("");
    showToast("已标记为争议件");
  };

  const availableTags = (Object.keys(DEFECT_TYPE_CONFIG) as DefectType[]).filter(
    (type) => !order.tags.some((t) => t.type === type)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800">{order.id}</h2>
              <StatusBadge status={order.status} size="sm" />
              {order.isDisputed && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <Flag className="w-3 h-3" />
                  争议件
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {order.applianceType} · {order.applianceModel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDisputeModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 bg-amber-50 rounded-md text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <Flag className="w-4 h-4" />
            标记争议
          </button>
          <button
            onClick={handleSubmitQuality}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            提交质检
          </button>
          <button
            onClick={handleCloseOrder}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            审核通过
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="col-span-3 space-y-5">
          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">照片证据</h3>
              <span className="text-sm text-gray-500">
                共 {order.photos.length} 张照片 · {order.evidenceAreas.length} 处证据
              </span>
            </div>
            <div className="p-4">
              {currentPhoto && (
                <PhotoViewer
                  photo={currentPhoto}
                  evidenceAreas={order.evidenceAreas}
                  selectedTagType={selectedTagType}
                />
              )}

              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                {order.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className={`relative shrink-0 w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedPhotoIndex === index
                        ? "border-primary-500 ring-2 ring-primary-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPhotoIndex(index)}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 text-center truncate">
                      {photo.angle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">师傅备注</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
                {order.remark}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">客户信息</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">客户姓名</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {desensitizeName(order.customerName)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">联系电话</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {desensitizePhone(order.phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">地址</p>
                  <p className="text-sm text-gray-700">{desensitizeAddress(order.address)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">上传时间</p>
                  <p className="text-sm text-gray-700">
                    {new Date(order.createdAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <ConfidenceBar value={order.confidence} />
            </div>
            <div className="p-4">
              {order.confidenceFactors.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">置信度影响因素</p>
                  {order.confidenceFactors.map((factor, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-amber-50 rounded-md text-xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-700">{factor.factor}</p>
                        <p className="text-amber-600 mt-0.5">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  各项指标良好，置信度高
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">缺陷标签</h3>
              {availableTags.length > 0 && (
                <button
                  onClick={() => setShowAddTag(!showAddTag)}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加标签
                </button>
              )}
            </div>

            {showAddTag && availableTags.length > 0 && (
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">选择要添加的标签类型：</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleAddTag(type)}
                      className="px-2 py-1 text-xs border border-dashed border-gray-300 rounded hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      + {DEFECT_TYPE_CONFIG[type].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 space-y-2">
              {order.tags.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无缺陷标签</p>
              ) : (
                order.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedTagType === tag.type
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                    onClick={() =>
                      setSelectedTagType(selectedTagType === tag.type ? null : tag.type)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <TagBadge type={tag.type} confidence={tag.confidence} />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">
                          {tag.source === "ai" ? "AI" : "人工"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(tag.id, tag.confidence);
                          }}
                          className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="调整置信度"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除标签"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {editingTagId === tag.id && (
                      <div
                        className="mt-3 pt-3 border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs text-gray-500 mb-2">调整置信度：</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="30"
                            max="100"
                            value={editConfidence}
                            onChange={(e) => setEditConfidence(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {editConfidence}%
                          </span>
                          <button
                            onClick={() => handleSaveEdit(tag.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTagId(null)}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-800">操作留痕</h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <AuditTimeline logs={order.auditLogs} />
            </div>
          </div>
        </div>
      </div>

      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">标记为争议件</h3>
            <p className="text-sm text-gray-500 mb-3">
              标记为争议件后，工单将进入争议件池，需质检员复核后才能继续流转。
            </p>
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1.5">争议原因（选填）</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="请输入标记争议的原因..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleMarkDisputed}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                确认标记
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
