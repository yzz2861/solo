import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Eye,
  Clock,
  Filter,
  ArrowUpDown,
  GripVertical,
  Flag,
  Send,
  RotateCcw,
  CheckCircle2,
  History,
} from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import TagBadge from "@/components/TagBadge/TagBadge";
import StatusBadge from "@/components/StatusBadge/StatusBadge";
import PhotoViewer from "@/components/PhotoViewer/PhotoViewer";
import AuditTimeline from "@/components/AuditTimeline/AuditTimeline";
import ConfidenceBar from "@/components/ConfidenceBar/ConfidenceBar";
import type { WorkOrder } from "@/types";
import { desensitizePhone, desensitizeName } from "@/utils/desensitize";

type TabType = "pending" | "disputed" | "passed";

export default function QualityDesk() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus, unmarkDisputed, markAsDisputed } = useOrderStore();

  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [sortBy, setSortBy] = useState<"confidence" | "time">("confidence");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const pendingOrders = useMemo(() => {
    let result = orders.filter(
      (o) =>
        (o.status === "quality_check" || o.confidence < 70) &&
        o.status !== "disputed" &&
        o.status !== "closed" &&
        o.status !== "quality_passed"
    );
    if (sortBy === "confidence") {
      result = result.sort((a, b) => a.confidence - b.confidence);
    } else {
      result = result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return result;
  }, [orders, sortBy]);

  const disputedOrders = useMemo(() => {
    return orders.filter((o) => o.isDisputed || o.status === "disputed");
  }, [orders]);

  const passedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "quality_passed");
  }, [orders]);

  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId)
    : null;

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const handleSelectOrder = (order: WorkOrder) => {
    setSelectedOrderId(order.id);
    setSelectedPhotoIndex(0);
  };

  const handlePass = () => {
    if (!selectedOrderId) return;
    updateOrderStatus(selectedOrderId, "quality_passed", "质检小李", "质检通过");
    showToast("质检已通过");
    setSelectedOrderId(null);
  };

  const handleReject = () => {
    if (!selectedOrderId) return;
    updateOrderStatus(selectedOrderId, "customer_reviewed", "质检小李", "需客服重新审核");
    showToast("已退回客服重新审核");
    setSelectedOrderId(null);
  };

  const handleMarkDisputed = () => {
    if (!selectedOrderId) return;
    markAsDisputed(selectedOrderId, "质检小李", "质检员标记为争议件");
    showToast("已标记为争议件");
  };

  const handleResolveDispute = () => {
    if (!selectedOrderId) return;
    unmarkDisputed(selectedOrderId, "质检小李", "争议解除，质检通过");
    showToast("争议已解除");
    setSelectedOrderId(null);
  };

  const handleBatchPass = () => {
    const list = activeTab === "pending" ? pendingOrders : disputedOrders;
    list.forEach((o) => {
      updateOrderStatus(o.id, "quality_passed", "质检小李", "批量质检通过");
    });
    showToast(`已批量通过 ${list.length} 个工单`);
  };

  const currentList =
    activeTab === "pending"
      ? pendingOrders
      : activeTab === "disputed"
      ? disputedOrders
      : passedOrders;

  const stats = {
    pending: pendingOrders.length,
    disputed: disputedOrders.length,
    passed: passedOrders.length,
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-5">
      <div className="w-80 bg-white rounded-lg shadow-card border border-gray-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4" />
                待复核
                <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
                  {stats.pending}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("disputed")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "disputed"
                  ? "bg-red-100 text-red-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Flag className="w-4 h-4" />
                争议件
                <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
                  {stats.disputed}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("passed")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "passed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                已通过
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">共 {currentList.length} 条</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortBy("confidence")}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === "confidence"
                    ? "bg-gray-200 text-gray-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                按置信度
              </button>
              <button
                onClick={() => setSortBy("time")}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === "time"
                    ? "bg-gray-200 text-gray-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                按时间
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentList.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">暂无{activeTab === "pending" ? "待复核" : activeTab === "disputed" ? "争议" : "已通过"}工单</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {currentList.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedOrderId === order.id
                      ? "border-primary-500 bg-primary-50 shadow-sm"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded overflow-hidden shrink-0 bg-gray-100">
                      <img
                        src={order.photos[0]?.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {order.id}
                        </p>
                        <span
                          className={`text-xs font-medium ${
                            order.confidence >= 80
                              ? "text-emerald-600"
                              : order.confidence >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {order.confidence}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.applianceType} · {desensitizeName(order.customerName)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {order.tags.slice(0, 2).map((tag) => (
                          <TagBadge
                            key={tag.id}
                            type={tag.type}
                            size="sm"
                            showConfidence={false}
                          />
                        ))}
                        {order.tags.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{order.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab !== "passed" && currentList.length > 0 && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleBatchPass}
              className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              批量全部通过
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-card border border-gray-100 flex flex-col min-w-0">
        {selectedOrder ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{selectedOrder.id}</h3>
                    <StatusBadge status={selectedOrder.status} size="sm" />
                    {selectedOrder.isDisputed && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        争议件
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedOrder.applianceType} · {selectedOrder.applianceModel} ·{" "}
                    {desensitizeName(selectedOrder.customerName)} ·{" "}
                    {desensitizePhone(selectedOrder.phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/review/${selectedOrder.id}`)}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  详情页
                </button>

                {activeTab === "disputed" ? (
                  <>
                    <button
                      onClick={handleReject}
                      className="px-3 py-1.5 text-sm text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      退回客服
                    </button>
                    <button
                      onClick={handleResolveDispute}
                      className="px-4 py-1.5 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      解除争议
                    </button>
                  </>
                ) : activeTab === "pending" ? (
                  <>
                    <button
                      onClick={handleMarkDisputed}
                      className="px-3 py-1.5 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1.5"
                    >
                      <Flag className="w-4 h-4" />
                      标记争议
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      打回
                    </button>
                    <button
                      onClick={handlePass}
                      className="px-4 py-1.5 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      通过
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-4 h-full">
                <div className="col-span-3 space-y-4">
                  {selectedOrder.photos[selectedPhotoIndex] && (
                    <PhotoViewer
                      photo={selectedOrder.photos[selectedPhotoIndex]}
                      evidenceAreas={selectedOrder.evidenceAreas}
                    />
                  )}

                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {selectedOrder.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className={`relative shrink-0 w-16 h-16 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                          selectedPhotoIndex === index
                            ? "border-primary-500 ring-2 ring-primary-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedPhotoIndex(index)}
                      >
                        <img
                          src={photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">师傅备注</h4>
                    <p className="text-sm text-gray-600">{selectedOrder.remark}</p>
                  </div>
                </div>

                <div className="col-span-2 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ConfidenceBar value={selectedOrder.confidence} />

                    {selectedOrder.confidenceFactors.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-500">降低把握的原因</p>
                        {selectedOrder.confidenceFactors.map((factor, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-2 bg-white rounded-md border border-gray-100"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-700">
                                {factor.factor}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {factor.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">缺陷标签</h4>
                    <div className="space-y-2">
                      {selectedOrder.tags.map((tag) => (
                        <div
                          key={tag.id}
                          className="p-2.5 bg-white rounded-md border border-gray-100"
                        >
                          <div className="flex items-center justify-between">
                            <TagBadge type={tag.type} confidence={tag.confidence} />
                            <span className="text-xs text-gray-400">
                              {tag.source === "ai" ? "AI识别" : "人工"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <History className="w-4 h-4 text-gray-600" />
                      <h4 className="text-sm font-medium text-gray-700">操作留痕</h4>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <AuditTimeline logs={selectedOrder.auditLogs} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">选择左侧工单进行质检复核</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === "pending"
                  ? "低置信度工单需重点关注"
                  : activeTab === "disputed"
                  ? "争议件需人工裁定后才能流转"
                  : "查看已通过质检的工单"}
              </p>
            </div>
          </div>
        )}
      </div>

      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
