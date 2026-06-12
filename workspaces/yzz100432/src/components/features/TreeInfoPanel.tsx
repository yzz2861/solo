import { TreePine, Ruler, MapPin, Activity, RefreshCw } from "lucide-react";
import type { Tree } from "../../types";
import { useAppStore } from "../../store/useAppStore";

interface TreeInfoPanelProps {
  tree: Tree;
}

const healthLabels: Record<string, { label: string; color: string }> = {
  good: { label: "良好", color: "text-green-600 bg-green-100" },
  fair: { label: "一般", color: "text-yellow-600 bg-yellow-100" },
  poor: { label: "较差", color: "text-red-600 bg-red-100" },
};

const shapeLabels: Record<string, string> = {
  round: "圆球形",
  oval: "卵圆形",
  conical: "圆锥形",
  irregular: "不规则形",
};

export function TreeInfoPanel({ tree }: TreeInfoPanelProps) {
  const { resetPruningBox } = useAppStore();
  const health = healthLabels[tree.healthStatus];

  return (
    <div className="bg-white rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
            <TreePine className="w-6 h-6 text-forest-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{tree.code}</h3>
            <p className="text-sm text-gray-500">{tree.species}</p>
          </div>
        </div>
        <button
          onClick={resetPruningBox}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-forest-600"
          title="重置修剪范围"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <Ruler className="w-4 h-4" />
            <span className="text-sm">树木高度</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-gray-800">
              {tree.height.toFixed(1)} m
            </span>
            {tree.heightEstimated && (
              <span className="px-1.5 py-0.5 text-xs bg-warning-100 text-warning-600 rounded">
                估算
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-forest-400" />
            </div>
            <span className="text-sm">树冠直径</span>
          </div>
          <span className="font-mono font-semibold text-gray-800">
            {(tree.crownRadius * 2).toFixed(1)} m
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">坐标位置</span>
          </div>
          <span className="font-mono text-sm text-gray-600">
            X:{tree.positionX.toFixed(1)} Z:{tree.positionZ.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-3 rounded bg-forest-400" />
            </div>
            <span className="text-sm">树冠形状</span>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {tree.crownShape ? shapeLabels[tree.crownShape] : "未知"}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <Activity className="w-4 h-4" />
            <span className="text-sm">健康状况</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${health.color}`}>
            {health.label}
          </span>
        </div>
      </div>
    </div>
  );
}
