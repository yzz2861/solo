import { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Eye, EyeOff, Layers, Lightbulb, Trees } from "lucide-react";
import { Scene } from "../components/three/Scene";
import { TreeInfoPanel } from "../components/features/TreeInfoPanel";
import { WarningPanel } from "../components/features/WarningPanel";
import { PruningControls } from "../components/features/PruningControls";
import { useAppStore } from "../store/useAppStore";
import { calculateSingleTreeLighting } from "../utils/lightingCalculator";

interface OutletContext {
  showNightMode: boolean;
}

export function PreviewPage() {
  const { showNightMode } = useOutletContext<OutletContext>();
  const { 
    warnings, 
    getSelectedTree, 
    saveScheme, 
    createTaskFromSelectedTree, 
    showHeatmap, 
    showClearanceLines,
    setShowHeatmap,
    setShowClearanceLines,
    streetLamps,
    pruningBox,
  } = useAppStore();
  
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  
  const selectedTree = getSelectedTree();

  const handleSaveScheme = useCallback(() => {
    const schemeName = prompt("请输入方案名称：");
    if (schemeName?.trim()) {
      saveScheme(schemeName.trim());
      alert("方案保存成功！");
    }
  }, [saveScheme]);

  const handleCreateTask = useCallback(() => {
    const recheckDate = prompt(
      "请输入复查日期（格式：YYYY-MM-DD，留空则默认为7天后）："
    );
    const date = recheckDate ? new Date(recheckDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    if (recheckDate && isNaN(date.getTime())) {
      alert("日期格式不正确，请使用 YYYY-MM-DD 格式");
      return;
    }
    
    createTaskFromSelectedTree(date);
    alert("任务创建成功！已添加到任务列表");
  }, [createTaskFromSelectedTree]);

  const lightingImprovement = selectedTree
    ? calculateSingleTreeLighting(selectedTree, streetLamps, pruningBox)
    : null;

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
          <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trees className="w-4 h-4 text-forest-500" />
              <span className="text-sm font-medium text-gray-700">园区3D预览</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-xs text-gray-500">
              点击树木选择，拖动修剪框调整范围
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showHeatmap
                    ? "bg-warning-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                热力图
              </button>
              <button
                onClick={() => setShowClearanceLines(!showClearanceLines)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showClearanceLines
                    ? "bg-forest-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {showClearanceLines ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                净空线
              </button>
              <button
                onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showBeforeAfter
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                对比视图
              </button>
            </div>
          </div>
        </div>

        {showBeforeAfter && selectedTree && lightingImprovement && (
          <div className="absolute top-20 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <h4 className="font-semibold text-gray-800 mb-3">修剪前后对比</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-8">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">修剪前照明</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {(lightingImprovement.before * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="text-gray-300">→</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">修剪后照明</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(lightingImprovement.after * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-lg">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  提升 {lightingImprovement.improvement.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        <Scene showNightMode={showNightMode} />
      </div>

      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 space-y-4 overflow-y-auto">
        {selectedTree ? (
          <>
            <TreeInfoPanel tree={selectedTree} />
            <PruningControls
              onSaveScheme={handleSaveScheme}
              onCreateTask={handleCreateTask}
            />
            {lightingImprovement && (
              <div className="bg-white rounded-xl p-4 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-warning-500" />
                  <h3 className="font-semibold text-gray-800">照明改善分析</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">修剪前覆盖率</span>
                    <span className="font-medium">{(lightingImprovement.before * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">修剪后覆盖率</span>
                    <span className="font-medium text-green-600">{(lightingImprovement.after * 100).toFixed(1)}%</span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">改善幅度</span>
                      <span className="font-bold text-green-600">
                        +{lightingImprovement.improvement.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-card text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trees className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-800 mb-1">选择树木</h3>
            <p className="text-sm text-gray-500">
              点击3D场景中的树木查看详情并设置修剪范围
            </p>
          </div>
        )}

        <WarningPanel warnings={warnings} />
      </div>
    </div>
  );
}
