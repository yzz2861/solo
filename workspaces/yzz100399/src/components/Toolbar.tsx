import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { exportRectificationList } from "@/utils/exportUtils";
import { Save, Download, Camera, RotateCcw, Trash2, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Toolbar() {
  const {
    components,
    risks,
    schemeName,
    maxHeight,
    bufferRange,
    saveScheme,
    clearScene,
    setSchemeName,
  } = usePlaygroundStore();
  const navigate = useNavigate();

  const handleSave = () => {
    saveScheme();
  };

  const handleExport = () => {
    exportRectificationList(
      { name: schemeName, maxHeight, bufferRange },
      components,
      risks
    );
  };

  const handleScreenshot = async () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `盲区截图_${schemeName}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      console.error("截图失败");
    }
  };

  const criticalCount = risks.filter((r) => r.severity === "critical").length;

  return (
    <div className="h-12 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 flex items-center px-4 gap-3">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
          <LayoutGrid size={14} className="text-white" />
        </div>
        <input
          type="text"
          value={schemeName}
          onChange={(e) => setSchemeName(e.target.value)}
          className="bg-transparent text-slate-200 text-sm font-medium border-none focus:outline-none focus:border-b focus:border-orange-400 w-32"
        />
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs transition-all"
      >
        <Save size={14} />
        保存方案
      </button>

      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs transition-all"
      >
        <Download size={14} />
        导出整改清单
      </button>

      <button
        onClick={handleScreenshot}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs transition-all"
      >
        <Camera size={14} />
        盲区截图
      </button>

      <button
        onClick={() => navigate("/schemes")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs transition-all"
      >
        方案管理
      </button>

      <div className="flex-1" />

      {criticalCount > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 text-xs font-medium animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {criticalCount} 个严重风险
        </div>
      )}

      <button
        onClick={clearScene}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs transition-all"
      >
        <Trash2 size={14} />
        清空
      </button>
    </div>
  );
}
