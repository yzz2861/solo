import { useState } from 'react';
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  User,
  Building2,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { useObjectStore } from '../store/useObjectStore';
import { useRiskStore } from '../store/useRiskStore';
import { useMallStore } from '../store/useMallStore';
import { useExport } from '../hooks/useExport';
import { cn } from '../lib/utils';
import { formatLoad } from '../utils/unitConversion';
import { calculateLoadPerM2 } from '../utils/unitConversion';
import { generateRectificationOpinion, generateLoadBasis, generatePassageBasis } from '../utils/riskEngine';

export default function Export() {
  const { objects } = useObjectStore();
  const { risks } = useRiskStore();
  const { config } = useMallStore();
  const { exportScheme, exportRectification, isExporting } = useExport();
  const [brandInfo, setBrandInfo] = useState({
    brandName: '品牌方名称',
    contact: '联系人',
    phone: '联系电话',
    exhibitionName: '汽车&家电展览会',
    date: new Date().toISOString().split('T')[0],
  });

  const dangerRisks = risks.filter((r) => r.severity === 'danger');
  const warningRisks = risks.filter((r) => r.severity === 'warning');
  const hasIssues = risks.length > 0;

  const totalWeight = objects.reduce((sum, o) => {
    const weightKg = o.weightUnit === 'ton' ? o.weight * 1000 : o.weight;
    return sum + weightKg;
  }, 0);

  const totalArea = objects.reduce((sum, o) => {
    const areaM2 = o.areaUnit === 'ft2' ? o.area * 0.0929 : o.area;
    return sum + areaM2;
  }, 0);

  const objectsWithIssues = objects.filter((o) =>
    risks.some((r) => r.objectId === o.id && r.severity === 'danger')
  );

  const handleExportScheme = async () => {
    await exportScheme(brandInfo);
  };

  const handleExportRectification = async () => {
    const rectification = generateRectificationOpinion(risks, objects, config);
    const loadBasis = generateLoadBasis(objects, config);
    const passageBasis = generatePassageBasis(risks, objects, config);
    
    await exportRectification(brandInfo, {
      rectification,
      loadBasis,
      passageBasis,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">方案导出</h1>
          <p className="text-slate-400">导出布展方案给品牌方，标注需调整位置和整改意见</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                项目信息
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">品牌方名称</label>
                  <input
                    type="text"
                    value={brandInfo.brandName}
                    onChange={(e) => setBrandInfo({ ...brandInfo, brandName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">展会名称</label>
                  <input
                    type="text"
                    value={brandInfo.exhibitionName}
                    onChange={(e) => setBrandInfo({ ...brandInfo, exhibitionName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">联系人</label>
                  <input
                    type="text"
                    value={brandInfo.contact}
                    onChange={(e) => setBrandInfo({ ...brandInfo, contact: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">联系电话</label>
                  <input
                    type="text"
                    value={brandInfo.phone}
                    onChange={(e) => setBrandInfo({ ...brandInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1.5">布展日期</label>
                  <input
                    type="date"
                    value={brandInfo.date}
                    onChange={(e) => setBrandInfo({ ...brandInfo, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                布展概览
              </h2>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white mb-1">{objects.length}</p>
                  <p className="text-sm text-slate-400">展具总数</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white mb-1">{(totalWeight / 1000).toFixed(1)}</p>
                  <p className="text-sm text-slate-400">总重量 (吨)</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white mb-1">{totalArea.toFixed(1)}</p>
                  <p className="text-sm text-slate-400">总面积 (m²)</p>
                </div>
                <div
                  className={cn(
                    'rounded-xl p-4 text-center',
                    hasIssues ? 'bg-red-500/10' : 'bg-emerald-500/10'
                  )}
                >
                  {hasIssues ? (
                    <>
                      <p className="text-3xl font-bold text-red-400 mb-1">{risks.length}</p>
                      <p className="text-sm text-red-400">待整改项</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                      <p className="text-sm text-emerald-400">方案合规</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300">展具清单</h3>
                <div className="overflow-hidden rounded-xl border border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">名称</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">类型</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">位置</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">尺寸</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">重量</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">单位承重</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {objects.map((obj) => {
                        const loadPerM2 = calculateLoadPerM2(obj.weight, obj.weightUnit, obj.area, obj.areaUnit);
                        const isOverload = loadPerM2 > config.floorLoadCapacity;
                        const hasDanger = risks.some((r) => r.objectId === obj.id && r.severity === 'danger');
                        
                        return (
                          <tr key={obj.id} className="hover:bg-slate-800/50">
                            <td className="px-4 py-3 text-sm text-white">{obj.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {obj.type === 'booth' ? '展台' : obj.type === 'car' ? '车辆' : '围挡'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                              ({obj.position[0].toFixed(1)}, {obj.position[2].toFixed(1)})
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                              {obj.dimensions.width}×{obj.dimensions.depth}m
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {obj.weight} {obj.weightUnit === 'ton' ? '吨' : 'kg'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'text-sm font-mono',
                                  isOverload ? 'text-red-400' : 'text-emerald-400'
                                )}
                              >
                                {formatLoad(loadPerM2)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {hasDanger ? (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                                  需调整
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                                  正常
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {objectsWithIssues.length > 0 && (
              <div className="bg-slate-900/50 rounded-2xl border border-red-500/30 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  需调整位置标注
                </h2>
                <div className="space-y-4">
                  {objectsWithIssues.map((obj) => {
                    const objRisks = risks.filter((r) => r.objectId === obj.id && r.severity === 'danger');
                    return (
                      <div key={obj.id} className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-white font-medium">{obj.name}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              当前位置: ({obj.position[0].toFixed(1)}, {obj.position[2].toFixed(1)})
                            </p>
                          </div>
                          <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                            {objRisks.length} 项问题
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {objRisks.map((risk) => (
                            <div key={risk.id} className="flex items-start gap-2 text-sm">
                              <span className="text-red-400">•</span>
                              <div>
                                <span className="text-slate-300">{risk.message}</span>
                                {risk.suggestedPosition && (
                                  <span className="text-emerald-400 ml-2">
                                    → 建议移至 ({risk.suggestedPosition[0].toFixed(1)},{' '}
                                    {risk.suggestedPosition[2].toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                导出选项
              </h2>

              <div className="space-y-4">
                <button
                  onClick={handleExportScheme}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
                >
                  {isExporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  导出布展方案
                </button>

                <button
                  onClick={handleExportRectification}
                  disabled={isExporting || risks.length === 0}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 px-4 py-3 font-medium rounded-xl transition-all duration-200 shadow-lg',
                    risks.length > 0
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed',
                    isExporting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isExporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileCheck className="w-5 h-5" />
                  )}
                  导出整改意见
                </button>

                {risks.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-emerald-500/10 p-3 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>方案无风险，无需整改</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">导出内容说明</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">📄</span>
                    <span><strong className="text-slate-300">布展方案:</strong> 包含3D场景截图、展具清单、位置图、风险项标注</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">📋</span>
                    <span><strong className="text-slate-300">整改意见:</strong> 包含承重计算依据、通道测量依据、具体整改要求</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">审批依据摘要</h3>
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-slate-400 mb-1">楼板承重限值</p>
                    <p className="text-white font-mono">{config.floorLoadCapacity} kN/m²</p>
                    <p className="text-slate-500 text-xs mt-1">
                      ≈ {(config.floorLoadCapacity / 9.8 * 1000).toFixed(0)} kg/m²
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-slate-400 mb-1">最小消防通道宽度</p>
                    <p className="text-white font-mono">{config.minPassageWidth} m</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-slate-400 mb-1">中庭尺寸</p>
                    <p className="text-white font-mono">
                      {config.atriumDimensions.width}m × {config.atriumDimensions.depth}m
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
