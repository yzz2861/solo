import { CheckCircle2, AlertTriangle, Calculator, Beaker, Droplets } from 'lucide-react';
import type { CalculationResult } from '@/types';
import { formatNumber, formatDoseUnit } from '@/utils/unitConversion';

interface ResultPanelProps {
  result: CalculationResult | null;
}

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result || result.steps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-5 bg-sky-600 rounded-full"></span>
          计算结果
        </h2>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calculator className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">请输入参数后查看计算结果</p>
          <p className="text-sm mt-2">填写左侧参数，系统将自动计算建议加药量</p>
        </div>
      </div>
    );
  }

  const hasDanger = result.warnings.some((w) => w.type === 'danger');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div
        className={`p-6 ${
          hasDanger
            ? 'bg-red-50 border-b-2 border-red-200'
            : 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white'
        }`}
      >
        <h2
          className={`text-lg font-semibold flex items-center gap-2 ${
            hasDanger ? 'text-red-800' : 'text-white'
          }`}
        >
          <span className={`w-1 h-5 rounded-full ${hasDanger ? 'bg-red-600' : 'bg-white'}`}></span>
          建议投加量
        </h2>
        <div className="mt-4 flex items-baseline gap-2">
          <span
            className={`text-5xl font-bold font-mono ${
              hasDanger ? 'text-red-600' : 'text-white'
            }`}
          >
            {formatNumber(result.dose)}
          </span>
          <span className={`text-xl ${hasDanger ? 'text-red-700' : 'text-sky-100'}`}>
            {formatDoseUnit(result.doseUnit)}
          </span>
          {hasDanger && (
            <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded-full">
              <AlertTriangle className="w-3 h-3" />
              不建议投加
            </span>
          )}
        </div>
        {!hasDanger && (
          <p className="text-sky-100 text-sm mt-2">
            约 {result.doseUnit === 'g' || result.doseUnit === 'kg' ? result.dose * 1000 : result.dose * 1000}{' '}
            {result.doseUnit === 'g' || result.doseUnit === 'kg' ? '毫克' : '毫升'}
          </p>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-sky-600" />
          计算步骤
        </h3>
        <div className="space-y-4">
          {result.steps.map((step) => (
            <div
              key={step.stepOrder}
              className="relative pl-8 pb-4 border-l-2 border-gray-100 last:border-l-0 last:pb-0"
            >
              <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 bg-sky-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {step.stepOrder}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-800 text-sm mb-2">{step.description}</p>
                <p className="text-xs text-gray-500 font-mono whitespace-pre-line">{step.formula}</p>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-sky-700">{step.result}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-sky-50 rounded-lg p-4 border border-sky-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-sky-800">安全提示</p>
              <p className="text-xs text-sky-600 mt-1">
                1. 投加前请再次核对药剂类型和浓度<br />
                2. 佩戴防护手套和护目镜操作<br />
                3. 投加后30分钟检测余氯并记录<br />
                4. 如水质异常请及时上报主管
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <Droplets className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">单位换算参考</p>
              <p className="text-xs text-gray-500 mt-1">
                1 mg/L = 1 ppm = 0.0001% <br />
                1 立方米 = 1000 升 <br />
                1 千克 = 1000 克
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
