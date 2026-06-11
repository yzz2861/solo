import type { Project } from '../types/project';
import type { Risk } from '../types/safety';
import type { BaseDevice } from '../types/devices';
import { isLightRig, isSpeaker, isHoistPoint, isAudienceArea, isStage, isLoadBearingDevice } from '../types/devices';
import { DEVICE_TYPE_LABELS } from '../constants/colors';
import { getRiskLevelLabel, getRiskTypeLabel } from '../types/safety';
import { normalizeWeightToKg } from './unitConversion';

interface ReportData {
  project: Project;
  generatedAt: number;
}

interface DeviceGroup {
  type: string;
  devices: BaseDevice[];
  totalWeight: number;
  count: number;
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const groupDevicesByType = (devices: BaseDevice[]): DeviceGroup[] => {
  const groups: Map<string, DeviceGroup> = new Map();
  
  devices.forEach(device => {
    const group = groups.get(device.type) || {
      type: device.type,
      devices: [],
      totalWeight: 0,
      count: 0,
    };
    
    group.devices.push(device);
    group.count++;
    
    if (isLoadBearingDevice(device)) {
      group.totalWeight += normalizeWeightToKg(device.weight, device.weightUnit);
    }
    
    groups.set(device.type, group);
  });
  
  return Array.from(groups.values());
};

const generateRiskSummary = (risks: Risk[]): string => {
  const critical = risks.filter(r => r.level === 'critical').length;
  const warning = risks.filter(r => r.level === 'warning').length;
  const info = risks.filter(r => r.level === 'info').length;
  
  return `严重: ${critical} 项，警告: ${warning} 项，提示: ${info} 项`;
};

const generateRiskTable = (risks: Risk[]): string => {
  if (risks.length === 0) {
    return '暂无安全风险。';
  }
  
  const sorted = [...risks].sort((a, b) => {
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });
  
  let md = '\n| 风险等级 | 风险类型 | 关联设备 | 描述 | 建议 |\n';
  md += '|---------|---------|---------|------|------|\n';
  
  sorted.forEach(risk => {
    md += `| ${getRiskLevelLabel(risk.level)} | ${getRiskTypeLabel(risk.type)} | ${risk.deviceId === 'global' ? '全局' : risk.deviceId} | ${risk.description} | ${risk.suggestion} |\n`;
  });
  
  return md;
};

const generateDeviceListTable = (devices: BaseDevice[]): string => {
  let md = '\n| 设备类型 | 设备名称 | 位置 (x, y, z) | 重量 | 备注 |\n';
  md += '|---------|---------|----------------|------|------|\n';
  
  const sorted = [...devices].sort((a, b) => {
    const typeOrder = { stage: 0, hoistPoint: 1, lightRig: 2, speaker: 3, audienceArea: 4 };
    return (typeOrder[a.type as keyof typeof typeOrder] || 99) - (typeOrder[b.type as keyof typeof typeOrder] || 99);
  });
  
  sorted.forEach(device => {
    const pos = device.position;
    const posStr = `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
    let weightStr = '-';
    let notes = '';
    
    if (isLoadBearingDevice(device)) {
      if (device.weightUnit === '') {
        weightStr = '未填写';
        notes = '⚠️ 需补充重量';
      } else {
        weightStr = `${normalizeWeightToKg(device.weight, device.weightUnit)} kg`;
      }
    }
    
    if (isHoistPoint(device)) {
      notes = `最大承重: ${device.maxLoad}kg`;
    }
    
    md += `| ${DEVICE_TYPE_LABELS[device.type] || device.type} | ${device.name} | ${posStr} | ${weightStr} | ${notes} |\n`;
  });
  
  return md;
};

const generateDeviceSummary = (devices: BaseDevice[]): string => {
  const groups = groupDevicesByType(devices);
  
  let md = '\n### 设备统计\n\n';
  md += '| 设备类型 | 数量 | 总重量 (kg) |\n';
  md += '|---------|------|-------------|\n';
  
  groups.forEach(group => {
    md += `| ${DEVICE_TYPE_LABELS[group.type] || group.type} | ${group.count} | ${group.totalWeight.toFixed(1)} |\n`;
  });
  
  const totalWeight = groups.reduce((sum, g) => sum + g.totalWeight, 0);
  md += `| **合计** | **${devices.length}** | **${totalWeight.toFixed(1)}** |\n`;
  
  return md;
};

export const generateMarkdownReport = (project: Project): string => {
  const data: ReportData = {
    project,
    generatedAt: Date.now(),
  };
  
  let md = `# 舞台吊点安全预演方案 - ${project.name}\n\n`;
  
  md += `> 报告生成时间: ${formatDate(data.generatedAt)}\n\n`;
  
  md += '## 1. 方案基本信息\n\n';
  md += `- **方案名称**: ${project.name}\n`;
  md += `- **创建时间**: ${formatDate(project.createdAt)}\n`;
  md += `- **最后更新**: ${formatDate(project.updatedAt)}\n`;
  md += `- **设备总数**: ${project.devices.length}\n`;
  md += `- **风险汇总**: ${generateRiskSummary(project.risks)}\n\n`;
  
  md += '## 2. 安全参数设置\n\n';
  md += '| 参数 | 数值 | 单位 |\n';
  md += '|------|------|------|\n';
  md += `| 单吊点最大承重 | ${project.safetySettings.maxHoistLoad} | kg |\n`;
  md += `| 观众区最小安全距离 | ${project.safetySettings.minAudienceDistance} | m |\n`;
  md += `| 最大负载分布方差 | ${project.safetySettings.maxLoadVariance} | - |\n\n`;
  
  md += '## 3. 风险评估\n\n';
  
  const criticalRisks = project.risks.filter(r => r.level === 'critical');
  if (criticalRisks.length > 0) {
    md += `> ⚠️ **警告**: 发现 ${criticalRisks.length} 项严重风险，请务必在搭台前解决！\n\n`;
  } else if (project.risks.length === 0) {
    md += '> ✅ **安全**: 未检测到安全风险。\n\n';
  }
  
  md += generateRiskTable(project.risks);
  md += '\n';
  
  md += '## 4. 设备清单\n';
  md += generateDeviceSummary(project.devices);
  md += '\n';
  md += generateDeviceListTable(project.devices);
  md += '\n';
  
  md += '## 5. 调整建议\n\n';
  
  if (project.risks.length === 0) {
    md += '当前方案符合安全要求，可以按此方案进行搭台。\n\n';
  } else {
    const suggestions = new Set(project.risks.map(r => r.suggestion));
    suggestions.forEach(s => {
      md += `- ${s}\n`;
    });
    md += '\n';
  }
  
  md += '---\n\n';
  md += `> 此报告由舞台吊点安全预演工具自动生成。\n`;
  md += `> 方案ID: ${project.id}\n`;
  
  return md;
};

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportProjectReport = (project: Project): void => {
  const report = generateMarkdownReport(project);
  const filename = `${project.name}-安全报告-${Date.now()}.md`;
  downloadFile(report, filename, 'text/markdown');
};

export const exportProjectJSON = (project: Project): void => {
  const json = JSON.stringify(project, null, 2);
  const filename = `${project.name}-方案数据-${Date.now()}.json`;
  downloadFile(json, filename, 'application/json');
};

export const printReport = (project: Project): void => {
  const report = generateMarkdownReport(project);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${project.name} - 安全报告</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #1a1d23; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        h3 { color: #4b5563; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        tr:nth-child(even) { background: #f9fafb; }
        .warning { background: #fef3c7 !important; }
        .critical { background: #fee2e2 !important; }
        blockquote { border-left: 4px solid #3b82f6; padding-left: 15px; color: #6b7280; margin: 20px 0; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <pre style="white-space: pre-wrap; font-family: inherit;">${report}</pre>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
