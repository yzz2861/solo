import React, { useMemo } from 'react';
import { FileText, Wrench, Printer, Download, Copy, Check } from 'lucide-react';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { generateFarmerReport, generateTechnicianReport } from '@/engine/report';
import { generateAdjustmentSuggestions } from '@/engine/nutrition';
import { getInventoryWarnings } from '@/engine/inventory';

export const ReportPanel: React.FC = () => {
  const {
    currentResult,
    currentFormula,
    ingredients,
    standards,
    selectedStandardIndex,
    reportType,
    setReportType,
  } = useCalculatorStore();

  const [copied, setCopied] = React.useState(false);

  const standard = standards[selectedStandardIndex];

  const reportContent = useMemo(() => {
    if (!currentResult || !standard) return '';

    if (reportType === 'farmer') {
      return generateFarmerReport(currentResult, currentFormula, ingredients, standard);
    } else {
      return generateTechnicianReport(currentResult, currentFormula, ingredients, standard);
    }
  }, [currentResult, currentFormula, ingredients, standard, reportType]);

  const quickSummary = useMemo(() => {
    if (!currentResult || !standard) return null;

    const warnings = getInventoryWarnings(currentResult.inventory, ingredients);
    const suggestions = generateAdjustmentSuggestions(
      currentResult.nutrition,
      ingredients,
      currentFormula
    );

    return { warnings, suggestions };
  }, [currentResult, standard, ingredients, currentFormula]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `饲料配方报告_${new Date().toLocaleDateString('zh-CN')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentResult) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">点击"开始计算"</h3>
          <p className="text-gray-500">
            完成配方设置后，点击计算按钮查看详细报告
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-wheat-green" />
          <h2 className="text-xl font-bold text-gray-800">评估报告</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-field rounded-lg p-1">
            <button
              className={`tab flex items-center gap-2 ${
                reportType === 'farmer' ? 'active' : ''
              }`}
              onClick={() => setReportType('farmer')}
            >
              <span>👨‍🌾</span>
              养殖户版
            </button>
            <button
              className={`tab flex items-center gap-2 ${
                reportType === 'technician' ? 'active' : ''
              }`}
              onClick={() => setReportType('technician')}
            >
              <Wrench className="w-4 h-4" />
              技术员版
            </button>
          </div>

          <div className="flex gap-2 no-print">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCopy}
              title="复制报告"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success-green" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleDownload}
              title="下载报告"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handlePrint}
              title="打印报告"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="card-body space-y-4">
        {reportType === 'farmer' && quickSummary && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center">
                <div className="text-3xl font-bold text-wheat-green mb-1">
                  {currentResult.availableDays}
                </div>
                <div className="text-sm text-gray-600">可用天数</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {currentResult.score}
                </div>
                <div className="text-sm text-gray-600">综合评分</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-center">
                <div className="text-3xl font-bold text-amber-600 mb-1">
                  ¥{currentResult.totalCost}
                </div>
                <div className="text-sm text-gray-600">本次成本</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  ¥{currentResult.costPerKg}
                </div>
                <div className="text-sm text-gray-600">每公斤成本</div>
              </div>
            </div>

            {quickSummary.warnings.length > 0 && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  ⚠️ 库存提醒
                </h4>
                <ul className="space-y-1">
                  {quickSummary.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-red-700">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {quickSummary.suggestions.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  💡 调整建议
                </h4>
                <ul className="space-y-1">
                  {quickSummary.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-blue-700">
                      {i + 1}. {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <pre className="p-4 font-mono text-sm whitespace-pre-wrap text-gray-700 leading-relaxed max-h-[600px] overflow-y-auto">
            {reportContent}
          </pre>
        </div>

        {reportType === 'farmer' && (
          <div className="p-4 bg-cream rounded-xl border border-soil-brown/20">
            <div className="text-sm text-soil-brown">
              📝 <strong>说明：</strong>
              本报告简化了专业术语，便于快速了解配方情况。
              如需查看详细折算过程和计算明细，请切换到"技术员版"。
            </div>
          </div>
        )}

        {reportType === 'technician' && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-sm text-blue-800">
              🔬 <strong>说明：</strong>
              本报告包含完整的营养折算过程和计算明细，可用于配方验证和存档。
              每项营养指标均显示"原料含量 × 配比比例 = 贡献值"的计算过程。
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
