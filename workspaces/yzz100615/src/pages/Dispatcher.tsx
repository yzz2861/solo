import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  History,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  calculateAxleLoad,
  calculateCargoContributions,
} from '@/utils/calculator';
import type { LoadStandard } from '@/types';
import AxleGauge from '@/components/AxleGauge';
import { formatWeight } from '@/utils/units';

type TabType = 'contribution' | 'versions' | 'standards';

export default function Dispatcher() {
  const navigate = useNavigate();
  const task = useStore((s) => s.getCurrentTask());
  const standard = useStore((s) => s.getCurrentStandard());
  const standards = useStore((s) => s.standards);
  const tasks = useStore((s) => s.tasks);
  const addStandard = useStore((s) => s.addStandard);
  const updateStandard = useStore((s) => s.updateStandard);
  const removeStandard = useStore((s) => s.removeStandard);
  const rollbackToVersion = useStore((s) => s.rollbackToVersion);
  const setCurrentTask = useStore((s) => s.setCurrentTask);

  const [activeTab, setActiveTab] = useState<TabType>('contribution');
  const [editingStandard, setEditingStandard] = useState<LoadStandard | null>(null);
  const [showAddStandard, setShowAddStandard] = useState(false);
  const [newStandard, setNewStandard] = useState<Partial<LoadStandard>>({
    name: '',
    vehicleType: '',
    frontLimit: 0,
    rearLimit: 0,
    totalLimit: 0,
  });

  const contributions = useMemo(() => {
    if (!task) return [];
    return calculateCargoContributions(task.cargoes, task.vehicleParams.wheelbase);
  }, [task]);

  const axleResult = useMemo(() => {
    if (!task || !standard) return null;
    return calculateAxleLoad(task.vehicleParams, task.cargoes, standard);
  }, [task, standard]);

  const handleSaveStandard = () => {
    if (!editingStandard) return;
    updateStandard(editingStandard.id, editingStandard);
    setEditingStandard(null);
  };

  const handleAddStandard = () => {
    if (!newStandard.name || !newStandard.frontLimit || !newStandard.rearLimit) return;
    addStandard(newStandard as Omit<LoadStandard, 'id'>);
    setNewStandard({
      name: '',
      vehicleType: '',
      frontLimit: 0,
      rearLimit: 0,
      totalLimit: 0,
    });
    setShowAddStandard(false);
  };

  const tabs = [
    { key: 'contribution' as const, label: '货物贡献', icon: BarChart3 },
    { key: 'versions' as const, label: '版本管理', icon: History },
    { key: 'standards' as const, label: '限载标准', icon: Settings },
  ];

  if (!task || !standard) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">调度中心</h1>
              <p className="text-xs text-gray-500">
                {task.name} · {task.vehiclePlate}
              </p>
            </div>
          </div>
          <select
            value={task.id}
            onChange={(e) => setCurrentTask(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-around">
            {axleResult && (
              <>
                <AxleGauge value={axleResult.frontAxle} limit={standard.frontLimit} label="前轴" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {formatWeight(axleResult.totalWeight, 'kg', 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">总重</div>
                </div>
                <AxleGauge value={axleResult.rearAxle} limit={standard.rearLimit} label="后轴" />
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'contribution' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">各货物轴荷贡献</h3>
                {contributions.length === 0 && (
                  <div className="py-12 text-center text-gray-400">暂无货物数据</div>
                )}
                <div className="space-y-3">
                  {contributions.map((c) => (
                    <div key={c.cargoId} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">{c.cargoName}</span>
                        <span className="text-sm text-gray-500">
                          总重: {formatWeight(c.weight, 'kg', 0)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16">前轴</span>
                          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${c.frontRatio * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono w-24 text-right">
                            {formatWeight(c.frontContribution, 'kg', 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16">后轴</span>
                          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${c.rearRatio * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono w-24 text-right">
                            {formatWeight(c.rearContribution, 'kg', 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-4">版本历史</h3>
                {task.versions.length === 0 && (
                  <div className="py-12 text-center text-gray-400">暂无保存版本</div>
                )}
                <div className="space-y-3">
                  {[...task.versions].reverse().map((v) => (
                    <div
                      key={v.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-semibold text-gray-800">版本 {v.versionNumber}</span>
                          {v.note && (
                            <span className="ml-2 text-sm text-gray-500">— {v.note}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(v.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-800">
                            {formatWeight(v.axleResult.frontAxle, 'kg', 0)}
                          </div>
                          <div className="text-xs text-gray-500">前轴</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-800">
                            {formatWeight(v.axleResult.rearAxle, 'kg', 0)}
                          </div>
                          <div className="text-xs text-gray-500">后轴</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-800">
                            {formatWeight(v.axleResult.totalWeight, 'kg', 0)}
                          </div>
                          <div className="text-xs text-gray-500">总重</div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => rollbackToVersion(v.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <RotateCcw size={14} />
                          回滚到此版本
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'standards' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">限载标准管理</h3>
                  <button
                    onClick={() => setShowAddStandard(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    新增标准
                  </button>
                </div>

                {showAddStandard && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-3">新增限载标准</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="标准名称"
                        value={newStandard.name}
                        onChange={(e) => setNewStandard({ ...newStandard, name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="车型"
                        value={newStandard.vehicleType}
                        onChange={(e) =>
                          setNewStandard({ ...newStandard, vehicleType: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="前轴限重(kg)"
                        value={newStandard.frontLimit || ''}
                        onChange={(e) =>
                          setNewStandard({
                            ...newStandard,
                            frontLimit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="后轴限重(kg)"
                        value={newStandard.rearLimit || ''}
                        onChange={(e) =>
                          setNewStandard({
                            ...newStandard,
                            rearLimit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="总限重(kg)"
                        value={newStandard.totalLimit || ''}
                        onChange={(e) =>
                          setNewStandard({
                            ...newStandard,
                            totalLimit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowAddStandard(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddStandard}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        确认添加
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">标准名称</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">适用车型</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">前轴限重</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">后轴限重</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">总限重</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {standards.map((s) => {
                        const isEditing = editingStandard?.id === s.id;
                        return (
                          <tr key={s.id} className="hover:bg-gray-50">
                            {isEditing ? (
                              <>
                                <td className="py-2 px-4">
                                  <input
                                    value={editingStandard.name}
                                    onChange={(e) =>
                                      setEditingStandard({
                                        ...editingStandard,
                                        name: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    value={editingStandard.vehicleType}
                                    onChange={(e) =>
                                      setEditingStandard({
                                        ...editingStandard,
                                        vehicleType: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    type="number"
                                    value={editingStandard.frontLimit}
                                    onChange={(e) =>
                                      setEditingStandard({
                                        ...editingStandard,
                                        frontLimit: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    type="number"
                                    value={editingStandard.rearLimit}
                                    onChange={(e) =>
                                      setEditingStandard({
                                        ...editingStandard,
                                        rearLimit: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    type="number"
                                    value={editingStandard.totalLimit}
                                    onChange={(e) =>
                                      setEditingStandard({
                                        ...editingStandard,
                                        totalLimit: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={handleSaveStandard}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                    >
                                      <Save size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingStandard(null)}
                                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-3 px-4 font-medium text-gray-800">{s.name}</td>
                                <td className="py-3 px-4 text-gray-600">{s.vehicleType}</td>
                                <td className="py-3 px-4 text-right font-mono text-gray-700">
                                  {formatWeight(s.frontLimit, 'kg', 0)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-gray-700">
                                  {formatWeight(s.rearLimit, 'kg', 0)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-gray-700">
                                  {formatWeight(s.totalLimit, 'kg', 0)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setEditingStandard(s)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button
                                      onClick={() => removeStandard(s.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
