import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { ContractorReport } from '@/components/report/ContractorReport';
import { useDrainageCalculation } from '@/hooks/useDrainageCalculation';
import { useCalculationStore } from '@/store/useCalculationStore';
import { generateContractorReport } from '@/utils/reportGenerator';
import { downloadTextFile } from '@/utils/export';
import { cn } from '@/lib/utils';

export default function ContractorReportPage() {
  const navigate = useNavigate();
  const { input, result } = useDrainageCalculation();
  const currentRecordId = useCalculationStore((state) => state.currentRecordId);
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

  const reportData = generateContractorReport(input, result);

  const handleExport = () => {
    const content = generateReportText(reportData, input, result, currentRecordId, projectName);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `施工队报告_${projectName || '未命名项目'}_${timestamp}.txt`;
    downloadTextFile(content, filename);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('报告链接已复制到剪贴板');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
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
            分享链接
          </button>
          <button
            onClick={handleExport}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm border-2',
              'bg-blue-700 text-white border-blue-700 hover:bg-blue-800 transition-colors'
            )}
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <ContractorReport data={reportData} />

      {currentRecordId && (
        <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 text-sm text-zinc-500">
          <p>记录编号：{currentRecordId}</p>
          <p className="mt-1">本报告可作为施工技术交底依据，请妥善保存</p>
        </div>
      )}
    </div>
  );
}

function generateReportText(
  reportData: ReturnType<typeof generateContractorReport>,
  input: ReturnType<typeof useDrainageCalculation>['input'],
  result: ReturnType<typeof useDrainageCalculation>['result'],
  recordId: string | null,
  projectName: string
): string {
  let text = `
==========================================
      雨棚排水坡度核算 - 施工队报告
==========================================

项目名称：${projectName || '未命名项目'}
记录编号：${recordId || '未保存'}
生成时间：${new Date().toLocaleString('zh-CN')}

一、输入参数
------------------------------------------
雨棚长度：${input.length} ${input.lengthUnit}
雨棚宽度：${input.width} ${input.widthUnit}
排水坡度：${input.slope} ‰
设计雨强：${input.rainfallIntensity} ${input.rainfallUnit}
排水口数量：${input.drainCount} 个
排水口口径：${input.drainDiameter} mm
排水口遮挡：${input.drainBlocked ? '是' : '否'}

二、评估结论
------------------------------------------
${reportData.summary}

三、计算过程
------------------------------------------
`;

  reportData.calculationSteps.forEach((step) => {
    text += `
${step.step}. ${step.title}
   公式：${step.formula}
   代入：${step.values}
   结果：${step.result}
`;
  });

  text += `
四、调整方案
------------------------------------------
`;

  reportData.suggestions.forEach((suggestion, index) => {
    const priorityText = { high: '【高优先级】', medium: '【中优先级】', low: '【低优先级】' };
    text += `
${index + 1}. ${priorityText[suggestion.priority]} ${suggestion.title}
   ${suggestion.description}
   ${suggestion.details}
`;
  });

  text += `
==========================================
          报告结束
==========================================
  `;

  return text;
}
