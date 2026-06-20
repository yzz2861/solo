import { useBufferStore } from '@/store/useBufferStore';
import { formatNumber, formatVolume } from '@/engine/convert';
import { Download, Printer } from 'lucide-react';

function generateCSV(): string {
  const { input, result } = useBufferStore.getState();
  if (!result) return '';

  const lines: string[] = [];
  lines.push('缓冲液pH配比助手 - 配方表');
  lines.push('');
  lines.push('输入参数');
  lines.push(`酸组分,${input.acidName}`);
  lines.push(`碱组分,${input.baseName}`);
  lines.push(`pKa,${input.pKa}`);
  lines.push(`酸母液浓度,${input.acidConcentration} ${input.acidConcentrationUnit}`);
  lines.push(`碱母液浓度,${input.baseConcentration} ${input.baseConcentrationUnit}`);
  lines.push(`目标pH,${input.targetPH}`);
  lines.push(`目标体积,${input.targetVolume} ${input.targetVolumeUnit}`);
  lines.push('');
  lines.push('计算结果');
  lines.push(`碱/酸浓度比 R,${formatNumber(result.ratio, 4)}`);
  lines.push(`酸母液体积,${formatVolume(result.acidVolume_mL)}`);
  lines.push(`碱母液体积,${formatVolume(result.baseVolume_mL)}`);
  lines.push(`定容用水,${formatVolume(result.waterVolume_mL)}`);
  lines.push(`定容至,${formatVolume(result.totalVolume_mL)}`);
  lines.push(`缓冲容量,${formatNumber(result.bufferCapacity, 4)} mol/(L·pH)`);
  lines.push('');
  lines.push('逐步计算');
  result.steps.forEach((step) => {
    lines.push(`步骤${step.step}: ${step.title}`);
    lines.push(`  公式,${step.formula}`);
    lines.push(`  代入,${step.substitution}`);
    lines.push(`  结果,${step.result}`);
  });

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('校验提示');
    result.warnings.forEach((w) => {
      lines.push(`[${w.level}] ${w.message} — ${w.suggestion}`);
    });
  }

  return lines.join('\n');
}

export default function ExportButton() {
  const result = useBufferStore((s) => s.result);

  if (!result) return null;

  const handleDownload = () => {
    const csv = generateCSV();
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `缓冲液配方_pH${useBufferStore.getState().input.targetPH}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-all hover:border-amber-300 hover:text-amber-700 active:scale-[0.97]"
      >
        <Download className="h-3.5 w-3.5" />
        导出 CSV
      </button>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-all hover:border-amber-300 hover:text-amber-700 active:scale-[0.97]"
      >
        <Printer className="h-3.5 w-3.5" />
        打印
      </button>
    </div>
  );
}
