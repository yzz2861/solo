import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCw, Move } from "lucide-react";
import type { Photo, EvidenceArea } from "@/types";
import { DEFECT_TYPE_CONFIG } from "@/utils/constants";

interface PhotoViewerProps {
  photo: Photo;
  evidenceAreas: EvidenceArea[];
  selectedTagType?: string | null;
  onAreaHover?: (area: EvidenceArea | null) => void;
}

export default function PhotoViewer({
  photo,
  evidenceAreas,
  selectedTagType,
  onAreaHover,
}: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const areasForPhoto = evidenceAreas.filter((a) => a.photoId === photo.id);

  const visibleAreas = selectedTagType
    ? areasForPhoto.filter((a) => a.tagType === selectedTagType)
    : areasForPhoto;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setHoveredAreaId(null);
  }, [photo.id]);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 font-medium">角度：{photo.angle}</span>
          <span className="text-xs text-gray-500">
            清晰度 {photo.clarity}分 · 亮度 {photo.brightness}分
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1"></div>
          <button
            onClick={handleRotate}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="旋转"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-xs px-2"
            title="重置"
          >
            重置
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden flex items-center justify-center min-h-[400px] max-h-[600px]"
        style={{ background: "#1a1a2e" }}
      >
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={photo.url}
            alt={`${photo.angle}视角照片`}
            className="max-w-full max-h-[550px] object-contain"
            draggable={false}
          />

          {visibleAreas.map((area) => {
            const config = DEFECT_TYPE_CONFIG[area.tagType];
            const isHovered = hoveredAreaId === area.id;

            return (
              <div
                key={area.id}
                className={`absolute border-2 transition-all duration-200 cursor-pointer ${
                  isHovered ? "z-10" : "z-0"
                }`}
                style={{
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                  borderColor: config.bgColor.replace("bg-", ""),
                  backgroundColor: `${config.bgColor.replace("bg-", "rgba(").replace(
                    "-500",
                    ", 0.15"
                  )}`,
                  boxShadow: isHovered
                    ? `0 0 0 2px white, 0 4px 12px rgba(0,0,0,0.5)`
                    : "none",
                }}
                onMouseEnter={() => {
                  setHoveredAreaId(area.id);
                  onAreaHover?.(area);
                }}
                onMouseLeave={() => {
                  setHoveredAreaId(null);
                  onAreaHover?.(null);
                }}
              >
                <div
                  className="absolute -top-7 left-0 px-1.5 py-0.5 text-xs font-medium text-white rounded whitespace-nowrap"
                  style={{ backgroundColor: config.bgColor.replace("bg-", "") }}
                >
                  {config.label}
                </div>

                <div className="absolute top-0 left-0 w-2 h-2 bg-white border border-current -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-0 right-0 w-2 h-2 bg-white border border-current translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-white border border-current -translate-x-1/2 translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-white border border-current translate-x-1/2 translate-y-1/2"></div>

                {isHovered && (
                  <div
                    className="absolute top-full left-0 mt-2 p-2 bg-white rounded shadow-lg text-xs text-gray-700 whitespace-nowrap z-20"
                    style={{ color: "#374151" }}
                  >
                    <div className="font-medium">{config.label}</div>
                    <div className="text-gray-500 mt-0.5">{area.description}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {zoom > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-gray-400 bg-black/40 px-2 py-1 rounded">
            <Move className="w-3 h-3" />
            拖拽查看
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          检测到 {areasForPhoto.length} 处证据区域
        </span>
        {photo.clarity < 60 && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
            照片偏模糊，可能影响识别准确度
          </span>
        )}
      </div>
    </div>
  );
}
