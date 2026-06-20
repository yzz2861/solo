import type { DisclosureFormData, CalculationRecord } from '@/types';

export function exportDisclosureFormAsText(form: DisclosureFormData): string {
  const content = `
==========================================
        雨棚排水技术交底单
==========================================

项目名称：${form.projectName}
记录编号：${form.recordId}
交底日期：${form.createdAt}

一、设计参数
------------------------------------------
1. 雨棚尺寸
   - 长度：${form.length} ${form.lengthUnit}
   - 宽度：${form.width} ${form.widthUnit}

2. 排水坡度：${form.slope} ‰

3. 设计暴雨强度：${form.rainfallIntensity} ${form.rainfallUnit}

4. 排水口参数
   - 数量：${form.drainCount} 个
   - 口径：${form.drainDiameter} mm

二、计算结果
------------------------------------------
1. 汇水面积：${form.result.areaM2.toFixed(2)} m²
2. 雨水量：${form.result.rainwaterVolume.toFixed(3)} L/s
3. 排水能力：${form.result.drainCapacity.toFixed(3)} L/s
4. 积水系数：${form.result.积水系数.toFixed(3)}

三、风险评估
------------------------------------------
风险等级：${getRiskLevelText(form.result.riskLevel)}

积水系数说明：
  - < 0.8：安全 ✓
  - 0.8 ~ 1.0：临界 ⚠
  - > 1.0：积水风险 ✗

坡度状态：${getSlopeStatusText(form.result.slopeStatus)}

四、施工要求
------------------------------------------
1. 严格按照设计坡度${form.slope}‰施工，确保坡向正确
2. 排水口口径必须达到${form.drainDiameter}mm，共${form.drainCount}个
3. 排水口安装完成后需做通水试验，确保排水通畅
4. 施工完成后进行闭水试验，确认无积水

五、复核确认
------------------------------------------
施工员确认：_______________ 日期：___________
施工队负责人：_______________ 日期：___________
业主确认：_______________ 日期：___________

==========================================
          本交底单一式三份
     施工员、施工队、业主各执一份
==========================================
  `.trim();

  return content;
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDisclosureForm(
  form: DisclosureFormData,
  projectName: string
): void {
  const content = exportDisclosureFormAsText(form);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `雨棚排水技术交底单_${projectName}_${timestamp}.txt`;
  downloadTextFile(content, filename);
}

export function exportCalculationRecord(record: CalculationRecord): void {
  const content = JSON.stringify(record, null, 2);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `雨棚排水计算记录_${record.id}_${timestamp}.json`;
  downloadTextFile(content, filename);
}

function getRiskLevelText(level: string): string {
  const map: Record<string, string> = {
    safe: '安全 ✓',
    warning: '临界 ⚠',
    danger: '积水风险 ✗',
  };
  return map[level] || level;
}

function getSlopeStatusText(status: string): string {
  const map: Record<string, string> = {
    excellent: '优秀 (≥5‰)',
    good: '良好 (3‰~5‰)',
    poor: '不足 (<3‰)',
    zero: '为零 (必须整改)',
  };
  return map[status] || status;
}
