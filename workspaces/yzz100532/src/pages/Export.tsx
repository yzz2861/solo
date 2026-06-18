import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Printer,
  FileText,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronDown,
  FileDown,
  Image,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { IndustrialButton } from "@/components/ui/IndustrialButton";
import { cn } from "@/lib/utils";
import { mockScenarios, mockTunnelNodes, mockTunnelEdges, mockFacilities } from "@/data/mock/tunnelData";
import type { Scenario, TunnelNode, TunnelEdge } from "@/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ExportFormat = "pdf" | "image" | "print";
type PaperSize = "a4" | "a3";
type PaperOrientation = "portrait" | "landscape";
type ExportVersion = "full" | "simple";

const accidentTypeMap: Record<string, string> = {
  fire: "火灾",
  flood: "水灾",
  collapse: "塌方",
  gas: "瓦斯",
};

export default function Export() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(mockScenarios[0].id);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [paperSize, setPaperSize] = useState<PaperSize>("a4");
  const [orientation, setOrientation] = useState<PaperOrientation>("portrait");
  const [version, setVersion] = useState<ExportVersion>("full");
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const scenarioDropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedScenario = useMemo(
    () => mockScenarios.find((s) => s.id === selectedScenarioId) || mockScenarios[0],
    [selectedScenarioId]
  );

  const routeNodes = useMemo(() => {
    const nodes: TunnelNode[] = [];
    const startNode = mockTunnelNodes.find((n) => n.id === selectedScenario.startNodeId);
    const endNode = mockTunnelNodes.find((n) => n.id === selectedScenario.endNodeId);
    if (startNode) nodes.push(startNode);

    const midNodes = mockTunnelNodes.filter(
      (n) => n.id !== selectedScenario.startNodeId && n.id !== selectedScenario.endNodeId
    );
    nodes.push(...midNodes.slice(0, 4));

    if (endNode) nodes.push(endNode);
    return nodes;
  }, [selectedScenario]);

  const estimatedTime = useMemo(() => {
    const baseTime = routeNodes.length * 60;
    const penalty = selectedScenario.constraints.length * 30;
    return baseTime + penalty;
  }, [routeNodes, selectedScenario]);

  const forbiddenAreas = useMemo(() => {
    return selectedScenario.constraints.filter((c) => c.type === "blocked" || c.type === "closed");
  }, [selectedScenario]);

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: orientation === "portrait" ? "portrait" : "landscape",
        unit: "mm",
        format: paperSize,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save(`${selectedScenario.name}-应急预案.pdf`);
    } catch (error) {
      console.error("PDF导出失败:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `${selectedScenario.name}-应急预案.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("图片导出失败:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const renderRouteSVG = () => {
    const padding = 40;
    const width = 500;
    const height = 350;

    const xs = mockTunnelNodes.map((n) => n.x);
    const ys = mockTunnelNodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const scaleX = (width - padding * 2) / (maxX - minX || 1);
    const scaleY = (height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

    const toSvgX = (x: number) => x * scale + offsetX;
    const toSvgY = (y: number) => height - (y * scale + offsetY);

    const routeNodeIds = routeNodes.map((n) => n.id);
    const routeEdgeIds: string[] = [];
    for (let i = 0; i < routeNodeIds.length - 1; i++) {
      const edge = mockTunnelEdges.find(
        (e) =>
          (e.from === routeNodeIds[i] && e.to === routeNodeIds[i + 1]) ||
          (e.to === routeNodeIds[i] && e.from === routeNodeIds[i + 1])
      );
      if (edge) routeEdgeIds.push(edge.id);
    }

    const forbiddenEdgeIds = forbiddenAreas
      .map((c) => c.edgeId)
      .filter((id): id is string => id !== undefined);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          </pattern>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        {mockTunnelEdges.map((edge) => {
          const fromNode = mockTunnelNodes.find((n) => n.id === edge.from);
          const toNode = mockTunnelNodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isRoute = routeEdgeIds.includes(edge.id);
          const isForbidden = forbiddenEdgeIds.includes(edge.id);

          let strokeColor = "#9ca3af";
          let strokeWidth = 3;
          let strokeDasharray = "";

          if (isForbidden) {
            strokeColor = "#ef4444";
            strokeWidth = 4;
            strokeDasharray = "8 4";
          } else if (isRoute) {
            strokeColor = "#00d4ff";
            strokeWidth = 5;
          } else if (edge.type === "main") {
            strokeColor = "#6b7280";
            strokeWidth = 4;
          }

          return (
            <line
              key={edge.id}
              x1={toSvgX(fromNode.x)}
              y1={toSvgY(fromNode.y)}
              x2={toSvgX(toNode.x)}
              y2={toSvgY(toNode.y)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
          );
        })}

        {mockTunnelNodes.map((node) => {
          const isStart = node.id === selectedScenario.startNodeId;
          const isEnd = node.id === selectedScenario.endNodeId;
          const isRoute = routeNodeIds.includes(node.id);

          let fillColor = "#6b7280";
          let radius = 6;

          if (isStart) {
            fillColor = "#22c55e";
            radius = 10;
          } else if (isEnd) {
            fillColor = "#f97316";
            radius = 10;
          } else if (isRoute) {
            fillColor = "#00d4ff";
            radius = 7;
          }

          return (
            <g key={node.id}>
              <circle
                cx={toSvgX(node.x)}
                cy={toSvgY(node.y)}
                r={radius}
                fill={fillColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
              {(isStart || isEnd) && node.name && (
                <text
                  x={toSvgX(node.x)}
                  y={toSvgY(node.y) - radius - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="bold"
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}

        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="120" height="80" fill="white" fillOpacity="0.9" rx="4" stroke="#e5e7eb" />
          <circle cx="15" cy="18" r="5" fill="#22c55e" stroke="white" strokeWidth="1" />
          <text x="25" y="22" fontSize="10" fill="#374151">起点</text>
          <circle cx="15" cy="38" r="5" fill="#f97316" stroke="white" strokeWidth="1" />
          <text x="25" y="42" fontSize="10" fill="#374151">安全出口</text>
          <line x1="8" y1="58" x2="22" y2="58" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round" />
          <text x="28" y="62" fontSize="10" fill="#374151">撤离路线</text>
          <line x1="8" y1="73" x2="22" y2="73" stroke="#ef4444" strokeWidth="3" strokeDasharray="4 2" strokeLinecap="round" />
          <text x="28" y="77" fontSize="10" fill="#374151">禁入区域</text>
        </g>
      </svg>
    );
  };

  const leftPanel = (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-orbitron font-semibold text-tech-cyan mb-2">方案选择</h3>
        <div className="relative" ref={scenarioDropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              "w-full px-4 py-3 text-left bg-mine-blue-dark border border-tech-cyan/30 rounded",
              "flex items-center justify-between",
              "hover:border-tech-cyan/50 transition-colors"
            )}
          >
            <span className="text-white">{selectedScenario.name}</span>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-mine-blue-dark border border-tech-cyan/30 rounded z-10 max-h-60 overflow-auto">
              {mockScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    setSelectedScenarioId(scenario.id);
                    setShowDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left hover:bg-tech-cyan/10 transition-colors",
                    scenario.id === selectedScenarioId ? "text-tech-cyan" : "text-gray-300"
                  )}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hud-border p-4 rounded">
        <div className="corner-tr" />
        <div className="corner-bl" />
        <h4 className="text-sm font-orbitron font-semibold text-tech-cyan mb-3">方案信息</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">方案名称</span>
            <span className="text-white">{selectedScenario.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">事故类型</span>
            <span className="text-warning-orange">
              {accidentTypeMap[selectedScenario.accidentType]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">起始位置</span>
            <span className="text-white">
              {mockTunnelNodes.find((n) => n.id === selectedScenario.startNodeId)?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">安全出口</span>
            <span className="text-safety-green">
              {mockTunnelNodes.find((n) => n.id === selectedScenario.endNodeId)?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">约束条件</span>
            <span className="text-alert-red">{selectedScenario.constraints.length} 项</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">创建时间</span>
            <span className="text-gray-300">
              {new Date(selectedScenario.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </div>

      <div className="hud-border p-4 rounded">
        <div className="corner-tr" />
        <div className="corner-bl" />
        <h4 className="text-sm font-orbitron font-semibold text-tech-cyan mb-3">
          <Clock size={16} className="inline mr-2" />
          预计撤离时间
        </h4>
        <div className="text-3xl font-orbitron font-bold text-tech-cyan text-center">
          {formatTime(estimatedTime)}
        </div>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-orbitron font-semibold text-tech-cyan">导出设置</h3>

      <div>
        <label className="block text-xs text-gray-400 mb-2">导出格式</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "pdf", label: "PDF", icon: <FileDown size={16} /> },
            { value: "image", label: "图片", icon: <Image size={16} /> },
            { value: "print", label: "打印", icon: <Printer size={16} /> },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setExportFormat(item.value as ExportFormat)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 px-2 rounded border transition-all",
                exportFormat === item.value
                  ? "border-tech-cyan bg-tech-cyan/10 text-tech-cyan"
                  : "border-metal-gray bg-mine-blue-dark text-gray-400 hover:border-tech-cyan/50"
              )}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">纸张大小</label>
        <div className="grid grid-cols-2 gap-2">
          {["a4", "a3"].map((size) => (
            <button
              key={size}
              onClick={() => setPaperSize(size as PaperSize)}
              className={cn(
                "py-2 px-4 rounded border text-sm transition-all",
                paperSize === size
                  ? "border-tech-cyan bg-tech-cyan/10 text-tech-cyan"
                  : "border-metal-gray bg-mine-blue-dark text-gray-400 hover:border-tech-cyan/50"
              )}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">方向</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "portrait", label: "纵向" },
            { value: "landscape", label: "横向" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setOrientation(item.value as PaperOrientation)}
              className={cn(
                "py-2 px-4 rounded border text-sm transition-all",
                orientation === item.value
                  ? "border-tech-cyan bg-tech-cyan/10 text-tech-cyan"
                  : "border-metal-gray bg-mine-blue-dark text-gray-400 hover:border-tech-cyan/50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">版本</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "full", label: "完整版", desc: "包含所有详细信息" },
            { value: "simple", label: "简版", desc: "关键信息，适合离线" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setVersion(item.value as ExportVersion)}
              className={cn(
                "py-2 px-3 rounded border text-sm transition-all",
                version === item.value
                  ? "border-tech-cyan bg-tech-cyan/10 text-tech-cyan"
                  : "border-metal-gray bg-mine-blue-dark text-gray-400 hover:border-tech-cyan/50"
              )}
            >
              <div className="font-medium">{item.label}</div>
              <div className="text-xs opacity-70">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 space-y-3 border-t border-metal-gray/50">
        <IndustrialButton
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Download size={18} />}
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          {isExporting ? "导出中..." : "导出 PDF"}
        </IndustrialButton>
        <IndustrialButton
          variant="default"
          size="md"
          fullWidth
          leftIcon={<Printer size={16} />}
          onClick={handlePrint}
        >
          打印预案
        </IndustrialButton>
        <IndustrialButton
          variant="default"
          size="md"
          fullWidth
          leftIcon={<Image size={16} />}
          onClick={handleDownloadImage}
          disabled={isExporting}
        >
          下载图片
        </IndustrialButton>
      </div>
    </div>
  );

  return (
    <PageLayout title="预案导出" rightPanel={rightPanel}>
      <div className="flex gap-6 h-full">
        <div className="w-72 shrink-0 no-print">{leftPanel}</div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 no-print">
            <h2 className="text-xl font-orbitron font-bold text-white">预案预览</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-2 rounded border border-metal-gray bg-mine-blue-dark text-gray-400 hover:text-tech-cyan hover:border-tech-cyan/50 transition-colors"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-sm text-gray-400 w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                className="p-2 rounded border border-metal-gray bg-mine-blue-dark text-gray-400 hover:text-tech-cyan hover:border-tech-cyan/50 transition-colors"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-mine-blue-dark/50 rounded-lg p-6 flex justify-center">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: zoom }}
              transition={{ duration: 0.2 }}
              style={{ transformOrigin: "top center" }}
            >
              <div
                ref={previewRef}
                className={cn(
                  "bg-white text-gray-800 shadow-2xl",
                  paperSize === "a4"
                    ? orientation === "portrait"
                      ? "w-[210mm] min-h-[297mm]"
                      : "w-[297mm] min-h-[210mm]"
                    : orientation === "portrait"
                    ? "w-[297mm] min-h-[420mm]"
                    : "w-[420mm] min-h-[297mm]"
                )}
              >
                <div className="p-8">
                  <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      应急撤离预案
                    </h1>
                    <p className="text-gray-600">{selectedScenario.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-gray-500">事故类型：</span>
                      <span className="font-bold text-alert-red">
                        {accidentTypeMap[selectedScenario.accidentType]}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-gray-500">预计撤离时间：</span>
                      <span className="font-bold text-gray-800">
                        {formatTime(estimatedTime)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText size={16} />
                      路线示意图
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <div className="aspect-[4/3]">{renderRouteSVG()}</div>
                    </div>
                  </div>

                  {version === "full" && (
                    <div className="mb-6">
                      <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <MapPin size={16} />
                        途经节点列表
                      </h3>
                      <div className="border border-gray-200 rounded overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                序号
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                节点名称
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                类型
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                备注
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {routeNodes.map((node, index) => (
                              <tr
                                key={node.id}
                                className={cn(
                                  "border-t border-gray-200",
                                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                )}
                              >
                                <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">
                                  {node.name || node.id}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {node.type === "entrance"
                                    ? "入口"
                                    : node.type === "exit"
                                    ? "出口"
                                    : node.type === "junction"
                                    ? "交叉口"
                                    : "设施"}
                                </td>
                                <td className="px-3 py-2">
                                  {index === 0 && (
                                    <span className="text-safety-green font-medium">起点</span>
                                  )}
                                  {index === routeNodes.length - 1 && (
                                    <span className="text-warning-orange font-medium">
                                      安全出口
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {forbiddenAreas.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-alert-red" />
                        禁止进入区域
                      </h3>
                      <div className="bg-alert-red/5 border border-alert-red/20 rounded-lg p-4">
                        <ul className="space-y-2 text-sm">
                          {forbiddenAreas.map((area) => {
                            const edge = mockTunnelEdges.find((e) => e.id === area.edgeId);
                            const fromNode = edge
                              ? mockTunnelNodes.find((n) => n.id === edge.from)
                              : null;
                            const toNode = edge
                              ? mockTunnelNodes.find((n) => n.id === edge.to)
                              : null;
                            return (
                              <li key={area.id} className="flex items-start gap-2">
                                <span className="text-alert-red mt-0.5">●</span>
                                <span className="text-gray-700">
                                  {fromNode?.name || ""} - {toNode?.name || ""}：
                                  {area.description}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}

                  {version === "full" && (
                    <div>
                      <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-warning-orange" />
                        注意事项
                      </h3>
                      <div className="bg-warning-orange/5 border border-warning-orange/20 rounded-lg p-4">
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-warning-orange mt-0.5">1.</span>
                            <span>撤离时请保持冷静，沿指定路线有序撤离，切勿拥挤。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-warning-orange mt-0.5">2.</span>
                            <span>经过积水区域时请注意脚下，防止滑倒。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-warning-orange mt-0.5">3.</span>
                            <span>如遇烟雾，请尽量压低身体前进，必要时使用湿毛巾捂住口鼻。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-warning-orange mt-0.5">4.</span>
                            <span>到达安全出口后，请在指定区域集合，等待清点人数。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-warning-orange mt-0.5">5.</span>
                            <span>禁止进入标注为红色的封闭/危险区域。</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {version === "full" && (
                    <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
                      <p>预案编号：{selectedScenario.id}</p>
                      <p>生成时间：{new Date().toLocaleString("zh-CN")}</p>
                      <p className="mt-1">本预案为系统自动生成，请结合实际情况使用</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
