import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Package, FileText, History } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { calculateAxleLoad, generateAdjustmentSuggestions } from '@/utils/calculator';
import type { WeightUnit, LengthUnit } from '@/types';
import AxleGauge from '@/components/AxleGauge';
import CargoVisual from '@/components/CargoVisual';
import CargoList from '@/components/CargoList';
import VehicleForm from '@/components/VehicleForm';
import AdjustmentPanel from '@/components/AdjustmentPanel';
import { formatWeight } from '@/utils/units';

export default function LoadingTeam() {
  const navigate = useNavigate();
  const task = useStore((s) => s.getCurrentTask());
  const standard = useStore((s) => s.getCurrentStandard());
  const standards = useStore((s) => s.standards);
  const updateVehicleParams = useStore((s) => s.updateVehicleParams);
  const addCargo = useStore((s) => s.addCargo);
  const updateCargo = useStore((s) => s.updateCargo);
  const removeCargo = useStore((s) => s.removeCargo);
  const saveVersion = useStore((s) => s.saveVersion);

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('mm');
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionNote, setVersionNote] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(true);

  const axleResult = useMemo(() => {
    if (!task || !standard) return null;
    return calculateAxleLoad(task.vehicleParams, task.cargoes, standard);
  }, [task, standard]);

  const suggestions = useMemo(() => {
    if (!task || !axleResult) return [];
    return generateAdjustmentSuggestions(
      task.cargoes,
      axleResult,
      task.vehicleParams.wheelbase,
      task.vehicleParams.carriageLength,
    );
  }, [task, axleResult]);

  const handleCargoMove = (cargoId: string, newPosition: number) => {
    updateCargo(cargoId, { position: newPosition });
  };

  const handleSaveVersion = () => {
    saveVersion(versionNote || '版本' + (task?.versions.length || 0) + 1);
    setShowSaveModal(false);
    setVersionNote('');
  };

  const handleStandardChange = (standardId: string) => {
    const tasks = useStore.getState().tasks;
    const currentTaskId = useStore.getState().currentTaskId;
    const updated = tasks.map((t) =>
      t.id === currentTaskId ? { ...t, standardId, updatedAt: new Date().toISOString() } : t,
    );
    useStore.setState({ tasks: updated });
  };

  if (!task || !standard) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  const hasOverload =
    axleResult?.frontOverloaded || axleResult?.rearOverloaded || axleResult?.totalOverloaded;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">装车班组 - 轴荷估算</h1>
              <p className="text-xs text-gray-500">
                {task.name} · {task.vehiclePlate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVehicleForm(!showVehicleForm)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Package size={16} />
              车辆参数
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasOverload
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Save size={16} />
              保存版本
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {hasOverload && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <div>
              <div className="font-semibold text-red-700">轴荷超限警告</div>
              <div className="text-sm text-red-600">
                {axleResult?.frontOverloaded && `前轴超载 ${Math.abs(axleResult.frontMargin).toFixed(0)} kg `}
                {axleResult?.rearOverloaded && `后轴超载 ${Math.abs(axleResult.rearMargin).toFixed(0)} kg `}
                {axleResult?.totalOverloaded && `总重超载 ${Math.abs(axleResult.totalMargin).toFixed(0)} kg`}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">实时轴荷</h2>
                <span className="text-sm text-gray-500">标准: {standard.name}</span>
              </div>
              <div className="flex items-center justify-around">
                {axleResult && (
                  <>
                    <AxleGauge
                      value={axleResult.frontAxle}
                      limit={standard.frontLimit}
                      label="前轴"
                      unit={weightUnit}
                      size="lg"
                    />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatWeight(axleResult.totalWeight, weightUnit, 1)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">总重</div>
                      <div
                        className={`text-sm mt-2 font-medium ${
                          axleResult.totalOverloaded ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        限重 {formatWeight(standard.totalLimit, weightUnit, 0)}
                      </div>
                    </div>
                    <AxleGauge
                      value={axleResult.rearAxle}
                      limit={standard.rearLimit}
                      label="后轴"
                      unit={weightUnit}
                      size="lg"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">货位布局</h2>
                <span className="text-xs text-gray-400">拖拽货物调整位置</span>
              </div>
              <CargoVisual
                cargoes={task.cargoes}
                carriageLength={task.vehicleParams.carriageLength}
                wheelbase={task.vehicleParams.wheelbase}
                carriageOffset={task.vehicleParams.carriageOffset}
                onCargoMove={handleCargoMove}
                selectedCargoId={selectedCargoId}
                onSelectCargo={setSelectedCargoId}
                height={140}
              />
            </div>

            <AdjustmentPanel suggestions={suggestions} lengthUnit={lengthUnit} />
          </div>

          <div className="space-y-6">
            {showVehicleForm && (
              <VehicleForm
                params={task.vehicleParams}
                standards={standards}
                selectedStandardId={task.standardId}
                weightUnit={weightUnit}
                lengthUnit={lengthUnit}
                onParamsChange={updateVehicleParams}
                onStandardChange={handleStandardChange}
                onWeightUnitChange={setWeightUnit}
                onLengthUnitChange={setLengthUnit}
              />
            )}

            <CargoList
              cargoes={task.cargoes}
              carriageLength={task.vehicleParams.carriageLength}
              weightUnit={weightUnit}
              lengthUnit={lengthUnit}
              selectedId={selectedCargoId}
              onSelect={setSelectedCargoId}
              onAdd={addCargo}
              onUpdate={updateCargo}
              onRemove={removeCargo}
            />

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <History size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-800">版本历史</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {task.versions.length === 0 && (
                  <div className="py-6 text-center text-gray-400 text-sm">暂无保存版本</div>
                )}
                {[...task.versions].reverse().map((v) => (
                  <div key={v.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 text-sm">
                        版本 {v.versionNumber}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(v.createdAt).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {v.note && <div className="text-xs text-gray-500 mt-1">{v.note}</div>}
                    <div className="flex gap-3 mt-2 text-xs">
                      <span
                        className={`${
                          v.axleResult.frontOverloaded ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        前: {v.axleResult.frontAxle.toFixed(0)}kg
                      </span>
                      <span
                        className={`${
                          v.axleResult.rearOverloaded ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        后: {v.axleResult.rearAxle.toFixed(0)}kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 text-lg">保存版本</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本说明</label>
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="例如：调整后合格版本"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-500">
                将保存当前货物布局和轴荷数据，版本号: {(task?.versions.length || 0) + 1}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
