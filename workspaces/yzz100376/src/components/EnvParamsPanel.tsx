import { Thermometer, Droplets, Target, Cookie, Percent } from 'lucide-react';
import { useRecipeStore } from '@/store';

interface ParamConfig {
  key: 'targetYield' | 'flourAbsorption' | 'roomHumidity' | 'starterRatio' | 'starterHydration';
  label: string;
  icon: typeof Thermometer;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
  iconClass: string;
}

const params: ParamConfig[] = [
  {
    key: 'targetYield',
    label: '目标出品量',
    icon: Target,
    unit: 'g',
    min: 100,
    max: 50000,
    step: 50,
    hint: '成品面团总重量',
    iconClass: 'text-bakery-brown',
  },
  {
    key: 'flourAbsorption',
    label: '面粉吸水率',
    icon: Cookie,
    unit: '%',
    min: 40,
    max: 80,
    step: 1,
    hint: '高筋粉通常58%-70%，包装袋上有标注',
    iconClass: 'text-bakery-orange',
  },
  {
    key: 'roomHumidity',
    label: '室内湿度',
    icon: Droplets,
    unit: '%',
    min: 10,
    max: 100,
    step: 1,
    hint: '湿度计读数，高湿度减水，低湿度加水',
    iconClass: 'text-bakery-water',
  },
  {
    key: 'starterRatio',
    label: '老面比例',
    icon: Percent,
    unit: '%',
    min: 0,
    max: 80,
    step: 5,
    hint: '相对于面粉重量的比例',
    iconClass: 'text-bakery-green',
  },
  {
    key: 'starterHydration',
    label: '老面含水量',
    icon: Thermometer,
    unit: '%',
    min: 40,
    max: 100,
    step: 1,
    hint: '制作老面时的加水量，通常60%-70%',
    iconClass: 'text-bakery-water',
  },
];

export function EnvParamsPanel() {
  const envParams = useRecipeStore((s) => s.envParams);
  const setEnvParams = useRecipeStore((s) => s.setEnvParams);
  const resetToDefault = useRecipeStore((s) => s.resetToDefault);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-bakery-orange/20 overflow-hidden">
      <div className="bg-gradient-to-r from-bakery-orange to-bakery-orangeLight px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            环境与参数
          </h2>
          <p className="text-white/80 text-sm mt-1">影响面团状态的关键因素</p>
        </div>
        <button
          onClick={resetToDefault}
          className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
        >
          恢复默认
        </button>
      </div>

      <div className="p-5 space-y-5">
        {params.map((param) => (
          <div key={param.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium text-bakery-brownDark">
                <param.icon className={`w-4 h-4 ${param.iconClass}`} />
                {param.label}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={envParams[param.key]}
                  onChange={(e) =>
                    setEnvParams({ [param.key]: parseFloat(e.target.value) || param.min })
                  }
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  className="w-20 px-2 py-1 text-right font-mono font-bold text-bakery-brownDark bg-bakery-cream/50 border border-bakery-orange/20 rounded-lg focus:border-bakery-orange outline-none"
                />
                <span className="text-sm text-bakery-brown/60 w-6">{param.unit}</span>
              </div>
            </div>
            <input
              type="range"
              value={envParams[param.key]}
              onChange={(e) =>
                setEnvParams({ [param.key]: parseFloat(e.target.value) })
              }
              min={param.min}
              max={param.max}
              step={param.step}
              className="w-full h-2 bg-bakery-cream rounded-lg appearance-none cursor-pointer accent-bakery-orange"
            />
            <p className="text-xs text-bakery-brown/50 pl-6">{param.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
