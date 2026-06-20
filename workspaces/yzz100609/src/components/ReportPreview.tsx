import React from 'react';
import { FileText, Printer, Download } from 'lucide-react';
import { generateManagerReport, generateTechnicalReport } from '@/utils/reportGenerator';
import type { HeatLoadInput, HeatLoadResult, SimulationResult } from '@/utils/heatLoadCalc';

interface ReportPreviewProps {
  input: HeatLoadInput;
  result: HeatLoadResult;
  simulation: SimulationResult | null;
}

export default function ReportPreview({ input, result, simulation }: ReportPreviewProps) {
  const timestamp = Date.now();
  const data = { input, result, simulation, timestamp };

  const managerReport = generateManagerReport(data);
  const technicalReport = generateTechnicalReport(data);

  const handlePrint = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>冷库开门热负荷估算报告</title>
          <style>
            body {
              font-family: "PingFang SC", "Microsoft YaHei", monospace;
              white-space: pre-wrap;
              line-height: 1.6;
              padding: 2rem;
              font-size: 13px;
              color: #1e293b;
            }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sky-400">
          <FileText className="h-4 w-4" />
          <h3 className="text-sm font-semibold">库管版报告</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          普通话描述温升风险与减少开门收益，适合培训装卸工和班组学习。
        </p>
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900/80 p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
          {managerReport}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={() => handlePrint(managerReport)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500 transition-colors"
          >
            <Printer className="h-3 w-3" />
            打印
          </button>
          <button
            onClick={() => handleDownload(managerReport, `冷库热负荷报告_库管版_${new Date().toLocaleDateString('zh-CN')}.txt`)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Download className="h-3 w-3" />
            下载
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2 text-violet-400">
          <FileText className="h-4 w-4" />
          <h3 className="text-sm font-semibold">设备版报告</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          保留完整计算假设与中间参数，供设备运维人员参考。
        </p>
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900/80 p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
          {technicalReport}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={() => handlePrint(technicalReport)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-500 transition-colors"
          >
            <Printer className="h-3 w-3" />
            打印
          </button>
          <button
            onClick={() => handleDownload(technicalReport, `冷库热负荷报告_设备版_${new Date().toLocaleDateString('zh-CN')}.txt`)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Download className="h-3 w-3" />
            下载
          </button>
        </div>
      </div>
    </div>
  );
}
