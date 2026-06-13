import { useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Upload,
  X,
  Image,
  FileText,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import PhotoViewer from "@/components/PhotoViewer/PhotoViewer";
import TagBadge from "@/components/TagBadge/TagBadge";
import ConfidenceBar from "@/components/ConfidenceBar/ConfidenceBar";
import StatusBadge from "@/components/StatusBadge/StatusBadge";
import type { Photo, EvidenceArea, DefectType } from "@/types";
import { DEFECT_TYPE_CONFIG, APPLIANCE_TYPES } from "@/utils/constants";
import { simulateAIAnalysis, generatePhotoQuality } from "@/utils/aiSimulator";
import { calculateConfidence } from "@/utils/confidence";
import { PHOTO_ANGLES } from "@/utils/constants";

const sampleImages = [
  "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
];

export default function PhotoScreening() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { orders, createNewOrder } = useOrderStore();

  const existingOrder = id && id !== "new" ? orders.find((o) => o.id === id) : null;

  const [photos, setPhotos] = useState<Photo[]>(existingOrder?.photos || []);
  const [remark, setRemark] = useState(existingOrder?.remark || "");
  const [applianceType, setApplianceType] = useState(existingOrder?.applianceType || "");
  const [customerName, setCustomerName] = useState(existingOrder?.customerName || "");
  const [phone, setPhone] = useState(existingOrder?.phone || "");
  const [address, setAddress] = useState(existingOrder?.address || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    tags: any[];
    evidenceAreas: EvidenceArea[];
    confidence: number;
    confidenceFactors: any[];
  } | null>(
    existingOrder
      ? {
          tags: existingOrder.tags,
          evidenceAreas: existingOrder.evidenceAreas,
          confidence: existingOrder.confidence,
          confidenceFactors: existingOrder.confidenceFactors,
        }
      : null
  );
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedTagType, setSelectedTagType] = useState<DefectType | null>(null);
  const [hoveredArea, setHoveredArea] = useState<EvidenceArea | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newPhotos: Photo[] = Array.from(files).map((file, index) => {
      const quality = generatePhotoQuality();
      return {
        id: `photo_${Date.now()}_${index}`,
        orderId: "",
        url: URL.createObjectURL(file),
        angle: PHOTO_ANGLES[(photos.length + index) % PHOTO_ANGLES.length],
        clarity: quality.clarity,
        brightness: quality.brightness,
      };
    });

    setPhotos((prev) => [...prev, ...newPhotos]);
  }, [photos.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (selectedPhotoIndex >= photos.length - 1) {
      setSelectedPhotoIndex(Math.max(0, photos.length - 2));
    }
  };

  const handleAIAnalysis = async () => {
    if (photos.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockOrderId = `WO${Date.now()}`;
    const result = simulateAIAnalysis(mockOrderId, photos, remark);

    const hasOldRepair = result.tags.some((t) => t.type === "old_repair");
    const { overallConfidence, factors } = calculateConfidence({
      photos,
      tags: result.tags,
      remark,
      hasOldRepair,
    });

    setAnalysisResult({
      tags: result.tags,
      evidenceAreas: result.evidenceAreas,
      confidence: overallConfidence,
      confidenceFactors: factors,
    });

    setIsAnalyzing(false);
  };

  const loadSampleData = () => {
    const samplePhotos: Photo[] = sampleImages.map((url, index) => {
      const quality = generatePhotoQuality();
      return {
        id: `sample_${index}`,
        orderId: "",
        url,
        angle: PHOTO_ANGLES[index % PHOTO_ANGLES.length],
        clarity: quality.clarity,
        brightness: quality.brightness,
      };
    });
    setPhotos(samplePhotos);
    setRemark("客户说冰箱不制冷，上门检查发现背后有裂纹，怀疑是运输时碰的");
    setApplianceType("冰箱");
    setCustomerName("张先生");
    setSelectedPhotoIndex(0);
  };

  const goToReview = () => {
    if (existingOrder) {
      navigate(`/review/${existingOrder.id}`);
      return;
    }

    if (!analysisResult) return;

    const newOrder = createNewOrder({
      photos,
      tags: analysisResult.tags,
      evidenceAreas: analysisResult.evidenceAreas,
      confidence: analysisResult.confidence,
      confidenceFactors: analysisResult.confidenceFactors,
      remark,
      applianceType: applianceType || "未分类",
      customerName: customerName || "待补充",
      phone: phone || "",
      address: address || "",
      createdBy: "客服小王",
    });

    navigate(`/review/${newOrder.id}`);
  };

  const currentPhoto = photos[selectedPhotoIndex];

  return (
    <div className="space-y-5">
      {existingOrder && (
        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">{existingOrder.id}</h3>
                <StatusBadge status={existingOrder.status} size="sm" />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {existingOrder.applianceType} · {existingOrder.applianceModel}
              </p>
            </div>
          </div>
          <button
            onClick={goToReview}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            进入审核
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary-600" />
                维修照片
              </h3>
              {!existingOrder && (
                <button
                  onClick={loadSampleData}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Zap className="w-4 h-4" />
                  加载示例
                </button>
              )}
            </div>

            {photos.length === 0 ? (
              <div
                className={`p-8 m-4 border-2 border-dashed rounded-lg transition-colors ${
                  isDragging
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">拖拽照片到此处上传</p>
                  <p className="text-xs text-gray-500 mt-1">或点击选择文件，支持多张上传</p>
                  <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，单张不超过 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            ) : (
              <div className="p-4">
                {currentPhoto && (
                  <PhotoViewer
                    photo={currentPhoto}
                    evidenceAreas={analysisResult?.evidenceAreas || []}
                    selectedTagType={selectedTagType}
                    onAreaHover={setHoveredArea}
                  />
                )}

                <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`relative shrink-0 w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
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
                      {!existingOrder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(index);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 text-center truncate">
                        {photo.angle}
                      </div>
                    </div>
                  ))}

                  {!existingOrder && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 w-20 h-20 rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs mt-1">添加</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                师傅备注
              </h3>
            </div>
            <div className="p-4">
              {existingOrder ? (
                <p className="text-sm text-gray-700 leading-relaxed">{remark}</p>
              ) : (
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请输入师傅的现场备注描述，有助于AI更准确识别..."
                  className="w-full h-24 px-3 py-2 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {!existingOrder && (
            <div className="bg-white rounded-lg shadow-card border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">工单信息</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">家电类型</label>
                  <select
                    value={applianceType}
                    onChange={(e) => setApplianceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">请选择</option>
                    {APPLIANCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">客户姓名</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="请输入客户姓名"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">联系电话</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入联系电话"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">客户地址</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="请输入客户地址"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-card border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI 初筛结果
              </h3>
            </div>

            <div className="p-4">
              {!analysisResult && !isAnalyzing && (
                <button
                  onClick={handleAIAnalysis}
                  disabled={photos.length === 0}
                  className={`w-full py-3 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                    photos.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:from-primary-700 hover:to-indigo-700"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  开始 AI 分析
                </button>
              )}

              {isAnalyzing && (
                <div className="py-8 text-center">
                  <Loader2 className="w-8 h-8 text-primary-500 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-gray-600 font-medium">AI 正在分析照片...</p>
                  <p className="text-xs text-gray-400 mt-1">识别缺陷类型、标注证据区域</p>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className="space-y-4">
                  <ConfidenceBar value={analysisResult.confidence} />

                  {analysisResult.confidenceFactors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        置信度影响因素
                      </p>
                      {analysisResult.confidenceFactors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 bg-amber-50 rounded-md"
                        >
                          <span className="text-amber-600 text-xs font-medium shrink-0 mt-0.5">
                            {factor.impact}%
                          </span>
                          <div>
                            <p className="text-xs font-medium text-gray-700">{factor.factor}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">检测到的缺陷</p>
                    <div className="space-y-2">
                      {analysisResult.tags.map((tag) => (
                        <div
                          key={tag.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedTagType === tag.type
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-100 bg-gray-50 hover:border-gray-200"
                          }`}
                          onClick={() =>
                            setSelectedTagType(selectedTagType === tag.type ? null : tag.type)
                          }
                        >
                          <div className="flex items-center justify-between">
                            <TagBadge type={tag.type} confidence={tag.confidence} />
                            <span className="text-xs text-gray-400">
                              {tag.source === "ai" ? "AI识别" : "人工"}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                DEFECT_TYPE_CONFIG[tag.type].bgColor
                              }`}
                              style={{ width: `${tag.confidence}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {hoveredArea && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-medium text-blue-700">
                        {DEFECT_TYPE_CONFIG[hoveredArea.tagType].label}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">{hoveredArea.description}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        共检测 {analysisResult.tags.length} 类缺陷
                      </span>
                      <span>{analysisResult.evidenceAreas.length} 处证据区域</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {analysisResult && (
            <button
              onClick={goToReview}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
            >
              前往客服审核
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
