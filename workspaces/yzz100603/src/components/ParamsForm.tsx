import { useAppStore } from '@/store/useAppStore';
import type { ChlorineUnit, ConcentrationUnit, DosingMethod } from '@/types';
import { formatChlorineUnit, formatConcentrationUnit } from '@/utils/unitConversion';

export function ParamsForm() {
  const { currentParams, setCurrentParams, chemicals } = useAppStore();

  const selectedChemical = chemicals.find((c) => c.id === currentParams.chemicalId);

  const handleChemicalChange = (chemicalId: string) => {
    const chemical = chemicals.find((c) => c.id === chemicalId);
    if (chemical) {
      setCurrentParams({
        chemicalId,
        chemicalConcentration: chemical.defaultConcentration,
        concentrationUnit: chemical.defaultUnit,
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <span className="w-1 h-5 bg-sky-600 rounded-full"></span>
        参数输入
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            池体体积
            <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="number"
              value={currentParams.poolVolume ?? ''}
              onChange={(e) =>
                setCurrentParams({
                  poolVolume: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="请输入池体体积"
              className={`flex-1 px-4 py-2.5 border rounded-l-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all ${
                !currentParams.poolVolume
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            <span className="inline-flex items-center px-4 py-2.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 text-sm">
              m³
            </span>
          </div>
          <p className="text-xs text-gray-500">游泳池或水池的总容积</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            pH 值
          </label>
          <input
            type="number"
            step="0.1"
            value={currentParams.ph ?? ''}
            onChange={(e) =>
              setCurrentParams({
                ph: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="请输入 pH 值"
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all ${
              currentParams.ph !== null &&
              (currentParams.ph < 7.2 || currentParams.ph > 7.8)
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-300'
            }`}
          />
          <p className="text-xs text-gray-500">正常范围：7.2 - 7.8</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            当前余氯
            <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              value={currentParams.currentChlorine ?? ''}
              onChange={(e) =>
                setCurrentParams({
                  currentChlorine: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="当前余氯值"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
            />
            <select
              value={currentParams.chlorineUnit}
              onChange={(e) =>
                setCurrentParams({
                  chlorineUnit: e.target.value as ChlorineUnit,
                })
              }
              className="px-3 py-2.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="mgL">mg/L</option>
              <option value="ppm">ppm</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">1 mg/L = 1 ppm</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            目标余氯
            <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              value={currentParams.targetChlorine ?? ''}
              onChange={(e) =>
                setCurrentParams({
                  targetChlorine: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="目标余氯值"
              className={`flex-1 px-4 py-2.5 border rounded-l-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all ${
                currentParams.targetChlorine !== null &&
                currentParams.currentChlorine !== null &&
                currentParams.targetChlorine < currentParams.currentChlorine
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            <span className="inline-flex items-center px-4 py-2.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 text-sm">
              {formatChlorineUnit(currentParams.chlorineUnit)}
            </span>
          </div>
          <p className="text-xs text-gray-500">建议范围：0.3 - 5.0 mg/L</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            药剂选择
            <span className="text-red-500">*</span>
          </label>
          <select
            value={currentParams.chemicalId}
            onChange={(e) => handleChemicalChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
          >
            {chemicals.map((chemical) => (
              <option key={chemical.id} value={chemical.id}>
                {chemical.name}（{chemical.type === 'tablet' ? '片剂' : '液体'}）
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            药剂浓度
            <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <input
              type="number"
              step="0.01"
              value={currentParams.chemicalConcentration ?? ''}
              onChange={(e) =>
                setCurrentParams({
                  chemicalConcentration: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="药剂浓度"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
            />
            <select
              value={currentParams.concentrationUnit}
              onChange={(e) =>
                setCurrentParams({
                  concentrationUnit: e.target.value as ConcentrationUnit,
                })
              }
              className="px-3 py-2.5 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="percent">%</option>
              <option value="mgL">mg/L</option>
              <option value="ppm">ppm</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            有效氯含量：{formatConcentrationUnit(currentParams.concentrationUnit)}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            投加方式
          </label>
          <div className="flex gap-2">
            {[
              { value: 'direct', label: '直接投加' },
              { value: 'diluted', label: '稀释投加' },
              { value: 'feeder', label: '投药器' },
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() =>
                  setCurrentParams({
                    dosingMethod: method.value as DosingMethod,
                  })
                }
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  currentParams.dosingMethod === method.value
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
          {selectedChemical && (
            <p className="text-xs text-gray-500">
              药剂类型：{selectedChemical.type === 'tablet' ? '片剂' : '液体'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
