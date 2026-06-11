import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import type { Order, Material, Evidence, AppealSummary, ExportFormat } from '../../shared/types.js';
import { maskAll } from './privacyMasker.service.js';
import { MATERIAL_TYPE_LABELS } from '../../shared/types.js';

interface ExportContext {
  project: Order;
  materials: Material[];
  evidence: Evidence[];
  summary: AppealSummary;
  materialOrder: string[];
}

const EXPORT_DIR = path.join(process.cwd(), 'data', 'exports');

export async function ensureExportDir() {
  try {
    await fs.access(EXPORT_DIR);
  } catch {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  }
}

export async function exportPackage(
  context: ExportContext,
  format: ExportFormat
): Promise<{ fileName: string; filePath: string }> {
  await ensureExportDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `申诉材料_${context.project.orderNo}_${timestamp}`;
  
  if (format === 'zip') {
    return await exportZip(context, baseName);
  } else if (format === 'pdf') {
    return await exportPdf(context, baseName);
  } else {
    return await exportWord(context, baseName);
  }
}

async function exportZip(context: ExportContext, baseName: string): Promise<{ fileName: string; filePath: string }> {
  const zip = new JSZip();
  const { project, materials, evidence, summary, materialOrder } = context;
  
  const orderedMaterials = materialOrder.length > 0
    ? materialOrder.map(id => materials.find(m => m.id === id)!).filter(Boolean)
    : materials;
  
  const indexContent = generateIndexMarkdown(context);
  zip.file('0_材料目录.md', indexContent);
  
  const summaryContent = maskAll(summary.content);
  zip.file('1_申诉摘要.md', summaryContent);
  
  const evidenceContent = generateEvidenceMarkdown(evidence);
  zip.file('2_证据清单.md', evidenceContent);
  
  for (let i = 0; i < orderedMaterials.length; i++) {
    const material = orderedMaterials[i];
    const typeLabel = MATERIAL_TYPE_LABELS[material.type];
    const filePrefix = `${String(i + 3).padStart(2, '0')}_${typeLabel}_`;
    
    try {
      const fileContent = await fs.readFile(material.filePath);
      zip.file(filePrefix + material.fileName, fileContent);
    } catch (error) {
      console.warn(`Failed to read file: ${material.fileName}`, error);
    }
  }
  
  const fileName = `${baseName}.zip`;
  const filePath = path.join(EXPORT_DIR, fileName);
  
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(filePath, content);
  
  return { fileName, filePath };
}

async function exportPdf(context: ExportContext, baseName: string): Promise<{ fileName: string; filePath: string }> {
  const { project, materials, evidence, summary } = context;
  
  let markdown = `# 差评申诉材料包 - ${project.orderNo}\n\n`;
  markdown += `**生成时间**：${new Date().toLocaleString('zh-CN')}\n\n`;
  markdown += `---\n\n`;
  
  markdown += `## 申诉摘要\n\n`;
  markdown += maskAll(summary.content) + '\n\n';
  markdown += `---\n\n`;
  
  markdown += `## 证据清单\n\n`;
  markdown += generateEvidenceMarkdown(evidence) + '\n\n';
  markdown += `---\n\n`;
  
  markdown += `## 材料清单\n\n`;
  for (let i = 0; i < materials.length; i++) {
    const material = materials[i];
    const typeLabel = MATERIAL_TYPE_LABELS[material.type];
    markdown += `${i + 1}. **${typeLabel}**：${material.fileName} (${formatFileSize(material.fileSize)})\n`;
    
    if (material.parsedContent) {
      markdown += `\n\`\`\`\n${maskAll(material.parsedContent.substring(0, 1000))}\n\`\`\`\n\n`;
    }
  }
  
  const fileName = `${baseName}.md`;
  const filePath = path.join(EXPORT_DIR, fileName);
  await fs.writeFile(filePath, markdown, 'utf-8');
  
  return { fileName, filePath };
}

async function exportWord(context: ExportContext, baseName: string): Promise<{ fileName: string; filePath: string }> {
  return await exportPdf(context, baseName);
}

function generateIndexMarkdown(context: ExportContext): string {
  const { project, materials, summary, materialOrder } = context;
  
  const orderedMaterials = materialOrder.length > 0
    ? materialOrder.map(id => materials.find(m => m.id === id)!).filter(Boolean)
    : materials;
  
  let content = `# 申诉材料目录\n\n`;
  content += `**订单号**：${project.orderNo}\n`;
  content += `**客户**：${project.customerName}\n`;
  content += `**生成时间**：${new Date().toLocaleString('zh-CN')}\n\n`;
  content += `---\n\n`;
  content += `## 文件清单\n\n`;
  content += `1. 1_申诉摘要.md - 申诉说明和关键证据汇总\n`;
  content += `2. 2_证据清单.md - 所有识别证据的详细列表\n`;
  
  for (let i = 0; i < orderedMaterials.length; i++) {
    const material = orderedMaterials[i];
    const typeLabel = MATERIAL_TYPE_LABELS[material.type];
    const filePrefix = `${String(i + 3).padStart(2, '0')}_${typeLabel}_`;
    content += `${i + 3}. ${filePrefix}${material.fileName}\n`;
  }
  
  content += `\n---\n\n`;
  content += `*本材料包由商家差评申诉助手自动生成，敏感信息已脱敏处理。*\n`;
  
  return content;
}

function generateEvidenceMarkdown(evidence: Evidence[]): string {
  if (evidence.length === 0) {
    return '暂无识别到的证据';
  }
  
  const grouped: Record<string, Evidence[]> = {
    shipping_time: [],
    customer_promise: [],
    refund_node: [],
    violation_speech: []
  };
  
  for (const e of evidence) {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e);
  }
  
  let content = '';
  const typeLabels: Record<string, string> = {
    shipping_time: '发货时间',
    customer_promise: '客户承诺',
    refund_node: '退款节点',
    violation_speech: '违规话术'
  };
  
  for (const [type, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    
    content += `### ${typeLabels[type]}\n\n`;
    
    for (let i = 0; i < items.length; i++) {
      const e = items[i];
      const confidence = Math.round(e.confidence * 100);
      const status = e.confirmed ? '✓ 已确认' : '⚠ 待确认';
      const riskText = e.riskLevel ? ` [${getRiskLabel(e.riskLevel)}]` : '';
      
      content += `${i + 1}. **${e.content}**\n`;
      content += `   - 置信度：${confidence}% ${status}${riskText}\n`;
      content += `   - 原文："${maskAll(e.sourceText)}"\n`;
      content += `   - 位置：${e.sourceLocation}\n`;
      if (e.timestamp) {
        content += `   - 时间：${e.timestamp}\n`;
      }
      if (e.notes) {
        content += `   - 备注：${e.notes}\n`;
      }
      content += `\n`;
    }
  }
  
  return content;
}

function getRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  };
  return labels[level] || level;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
