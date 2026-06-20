import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Printer } from 'lucide-react';
import { OwnerReport } from '@/components/report/OwnerReport';
import { useDrainageCalculation } from '@/hooks/useDrainageCalculation';
import { useCalculationStore } from '@/store/useCalculationStore';
import { generateOwnerReport } from '@/utils/reportGenerator';
import { downloadTextFile } from '@/utils/export';
import { cn } from '@/lib/utils';

export default function OwnerReportPage() {
  const navigate = useNavigate();
  const { input, result } = useDrainageCalculation();
  const currentRecordId = useCalculationStore((state) => state.currentRecordId);
  const saveRecord = useCalculationStore((state) => state.saveRecord);
  const projectName = useCalculationStore((state) => state.projectName);

  if (!result) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-zinc-500 mb-4">请先在计算页面输入参数</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回计算页面
        </button>
      </div>
    );
  }

  const recordId = currentRecordId || saveRecord()?.id || 'TEMP-' + Date.now();
  const reportData = generateOwnerReport(input, result, recordId);

  const handleExport = () => {
    const content = generateReportText(reportData, input, result, recordId, projectName);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `业主报告_${projectName || '未命名项目'}_${timestamp}.txt`;
    downloadTextFile(content, filename);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('报告链接已复制到剪贴板');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回计算
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm border-2',
              'border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors'
            )}
          >
            <Share2 className="w-4 h-4" />
            分享
          </button>
          <button
            onClick={handlePrint}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm border-2',
              'border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors'
            )}
          >
            <Printer className="w-4 h-4" />
            打印
          </button>
          <button
            onClick={handleExport}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm border-2',
              'bg-blue-700 text-white border-blue-700 hover:bg-blue-800 transition-colors'
            )}
          >
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>
      </div>

      <OwnerReport data={reportData} />
    </div>
  );
}

function generateReportText(
  reportData: ReturnType<typeof generateOwnerReport>,
  input: ReturnType<typeof useDrainageCalculation>['input'],
  result: ReturnType<typeof useDrainageCalculation>['result'],
  recordId: string,
  projectName: string
): string {
  const riskLevelText = {
    safe: '安全 ✓ 无积水风险',
    warning: '临界 ⚠ 存在一定积水风险',
    danger: '危险 ✗ 存在积水风险',
  };

  return `
==========================================
      雨棚排水评估报告（业主版）
==========================================

项目名称：${projectName || '未命名项目'}
报告编号：${recordId}
生成时间：${reportData.timestamp}

一、评估结论
------------------------------------------
${reportData.summary}

风险等级：${riskLevelText[reportData.riskLevel]}

${reportData.riskDescription}

二、评估说明
------------------------------------------
本报告基于以下参数进行评估：
1. 雨棚尺寸：${input.length} ${input.lengthUnit} × ${input.width} ${input.widthUnit}
2. 排水坡度：${input.slope} ‰
3. 设计雨强：${input.rainfallIntensity} ${input.rainfallUnit}
4. 排水口：${input.drainCount} 个 × ${input.drainDiameter} mm 口径

三、计算结果
------------------------------------------
汇水面积：${result.areaM2.toFixed(2)} m²
雨水量：${result.rainwaterVolume.toFixed(3)} L/s
排水能力：${result.drainCapacity.toFixed(3)} L/s
积水系数：${result.积水系数.toFixed(3)}

风险评估标准：
  - 积水系数 < 0.8：安全
  - 0.8 ≤ 积水系数 < 1.0：临界
  - 积水系数 ≥ 1.0：危险

==========================================
本报告由雨棚排水坡度核算系统自动生成
如有疑问请咨询施工单位或技术人员
==========================================
  `.trim();
}
