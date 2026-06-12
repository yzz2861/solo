import { useState } from "react";
import { Save, Play, RotateCcw, Scissors, ArrowUpDown, Maximize2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { getClearanceStatus } from "../../utils/collisionDetector";
import { determinePruningSide, generatePhotoRequirements, calculateLandscapeScore } from "../../utils/landscapeScorer";

interface PruningControlsProps {
  onSaveScheme: () => void;
  onCreateTask: () => void;
}

export function PruningControls({ onSaveScheme, onCreateTask }: PruningControlsProps) {
  const { pruningBox, updatePruningBox, getSelectedTree, streetLamps, signs, benches } = useAppStore();
  const [schemeName, setSchemeName] = useState("");

  const tree = getSelectedTree();

  const handlePositionChange = (axis: number, value: number) => {
    const newPosition = [...pruningBox.position] as [number, number, number];
    newPosition[axis] = value;
    updatePruningBox({ position: newPosition });
  };

  const handleSizeChange = (axis: number, value: number) => {
    const newSize = [...pruningBox.size] as [number, number, number];
    newSize[axis] = Math.max(0.5, value);
    updatePruningBox({ size: newSize });
  };

  const clearanceHeight = pruningBox.position[1] - pruningBox.size[1] / 2;
  const clearanceStatus = getClearanceStatus(clearanceHeight);

  const landscapeScore = tree
    ? calculateLandscapeScore(tree, pruningBox, { lamps: streetLamps, signs, benches })
    : null;

  if (!tree) return null;

  const pruningSide = determinePruningSide(tree, pruningBox);
  const photoRequirements = generatePhotoRequirements(tree, pruningSide);

  return (
    <div className="bg-white rounded-xl p-4 shadow-card space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-warning-500/10 rounded-lg flex items-center justify-center">
          <Scissors className="w-4 h-4 text-warning-500" />
        </div>
        <h3 className="font-semibold text-gray-800">修剪参数设置</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">修剪范围位置</span>
          </div>
          <div className="space-y-2">
            {["X轴", "Y轴(高度)", "Z轴"].map((label, axis) => (
              <div key={axis} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-500">{label}</span>
                <input
                  type="range"
                  min={axis === 1 ? 0.5 : -30}
                  max={axis === 1 ? tree.height : 30}
                  step={0.1}
                  value={pruningBox.position[axis]}
                  onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-right font-mono text-sm text-gray-600">
                  {pruningBox.position[axis].toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Maximize2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">修剪范围大小</span>
          </div>
          <div className="space-y-2">
            {["宽度(X)", "高度(Y)", "深度(Z)"].map((label, axis) => (
              <div key={axis} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-500">{label}</span>
                <input
                  type="range"
                  min={0.5}
                  max={axis === 1 ? tree.height : tree.crownRadius * 3}
                  step={0.1}
                  value={pruningBox.size[axis]}
                  onChange={(e) => handleSizeChange(axis, parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-right font-mono text-sm text-gray-600">
                  {pruningBox.size[axis].toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">行人净空高度</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold" style={{ color: clearanceStatus.color }}>
                {clearanceHeight.toFixed(1)} m
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: clearanceStatus.color }}
              >
                {clearanceStatus.label}
              </span>
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, (clearanceHeight / 3) * 100)}%`,
                backgroundColor: clearanceStatus.color,
              }}
            />
          </div>
        </div>

        {landscapeScore && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">景观评分</span>
              <span
                className="font-bold text-lg"
                style={{ color: landscapeScore.breakdown.shapeScore >= 7 ? "#10B981" : "#FF9F1C" }}
              >
                {landscapeScore.totalScore.toFixed(1)}
                <span className="text-sm font-normal text-gray-400">/10</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-gray-500">形态</p>
                <p className="font-semibold text-gray-700">{landscapeScore.breakdown.shapeScore.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-gray-500">遮挡</p>
                <p className="font-semibold text-gray-700">{landscapeScore.breakdown.obstructionScore.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-gray-500">协调</p>
                <p className="font-semibold text-gray-700">{landscapeScore.breakdown.harmonyScore.toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-forest-50 rounded-lg border border-forest-100">
          <p className="text-xs text-forest-600 mb-1 font-medium">修剪方位</p>
          <p className="text-sm font-medium text-forest-800">{pruningSide}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">照片要求预览</p>
          <p className="text-sm text-gray-700">{photoRequirements}</p>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="输入方案名称..."
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-forest-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (schemeName.trim()) {
                  onSaveScheme();
                  setSchemeName("");
                }
              }}
              disabled={!schemeName.trim()}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存方案
            </button>
            <button
              onClick={onCreateTask}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              创建任务
            </button>
          </div>
          <button
            onClick={() => {
              setSchemeName("");
              // Reset to default
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            重置参数
          </button>
        </div>
      </div>
    </div>
  );
}
