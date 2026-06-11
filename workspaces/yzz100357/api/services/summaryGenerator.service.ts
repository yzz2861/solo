import type { Evidence, Order } from '../../shared/types.js';
import { maskAll } from './privacyMasker.service.js';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SummaryContext {
  project: Order;
  evidence: Evidence[];
  materialsCount: number;
}

const SUMMARY_TEMPLATE = `## 申诉说明

**订单号**：{{orderNo}}
**客户昵称**：{{customerName}}
**下单时间**：{{orderTime}}
**申诉截止时间**：{{appealDeadline}}

---

## 事件时间线

{{timeline}}

---

## 关键证据

### 发货时间
{{shippingEvidence}}

### 客户承诺
{{promiseEvidence}}

### 退款节点
{{refundEvidence}}

### 违规话术
{{violationEvidence}}

---

## 申诉诉求

{{appealRequest}}

---

## 材料清单

共 {{materialsCount}} 份材料：
{{materialList}}

---

*本摘要由系统自动生成，敏感信息已脱敏处理。*
`;

export function generateSummary(context: SummaryContext): string {
  const { project, evidence, materialsCount } = context;
  
  const confirmedEvidence = evidence.filter(e => e.confirmed);
  const shippingEvidence = confirmedEvidence.filter(e => e.type === 'shipping_time');
  const promiseEvidence = confirmedEvidence.filter(e => e.type === 'customer_promise');
  const refundEvidence = confirmedEvidence.filter(e => e.type === 'refund_node');
  const violationEvidence = confirmedEvidence.filter(e => e.type === 'violation_speech');
  
  const timeline = generateTimeline(confirmedEvidence);
  
  let summary = SUMMARY_TEMPLATE
    .replace(/\{\{orderNo\}\}/g, project.orderNo)
    .replace(/\{\{customerName\}\}/g, maskName(project.customerName))
    .replace(/\{\{orderTime\}\}/g, formatDate(project.orderTime))
    .replace(/\{\{appealDeadline\}\}/g, formatDate(project.appealDeadline))
    .replace(/\{\{timeline\}\}/g, timeline)
    .replace(/\{\{shippingEvidence\}\}/g, formatEvidenceList(shippingEvidence))
    .replace(/\{\{promiseEvidence\}\}/g, formatEvidenceList(promiseEvidence))
    .replace(/\{\{refundEvidence\}\}/g, formatEvidenceList(refundEvidence))
    .replace(/\{\{violationEvidence\}\}/g, formatEvidenceList(violationEvidence))
    .replace(/\{\{appealRequest\}\}/g, generateAppealRequest(violationEvidence.length > 0))
    .replace(/\{\{materialsCount\}\}/g, String(materialsCount))
    .replace(/\{\{materialList\}\}/g, generateMaterialList(materialsCount));
  
  summary = maskAll(summary);
  
  return summary;
}

function generateTimeline(evidence: Evidence[]): string {
  const sorted = [...evidence].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  
  if (sorted.length === 0) {
    return '暂无时间线数据';
  }
  
  return sorted.map((e, index) => {
    const time = e.timestamp || '时间未知';
    const typeLabel = getEvidenceTypeLabel(e.type);
    return `${index + 1}. **${time}** - ${typeLabel}：${e.content}`;
  }).join('\n');
}

function formatEvidenceList(evidence: Evidence[]): string {
  if (evidence.length === 0) {
    return '暂无相关证据';
  }
  
  return evidence.map((e, index) => {
    const confidence = Math.round(e.confidence * 100);
    const riskText = e.riskLevel ? ` [${getRiskLabel(e.riskLevel)}]` : '';
    return `${index + 1}. ${e.content}\n   - 置信度：${confidence}%${riskText}\n   - 原文引用："${e.sourceText}"\n   - 来源：${e.sourceLocation}`;
  }).join('\n\n');
}

function generateAppealRequest(hasViolation: boolean): string {
  if (hasViolation) {
    return `1. 申请撤销客户恶意差评
2. 申请恢复店铺评分和信誉
3. 申请对该客户的违规行为进行平台处罚
4. 申请保留本次申诉记录作为店铺维权凭证`;
  }
  return `1. 申请重新评估本次差评
2. 申请核实相关证据材料
3. 申请维护商家正当权益`;
}

function generateMaterialList(count: number): string {
  const types = ['聊天记录', '物流截图', '退款凭证', '其他材料'];
  return types.map((type, index) => {
    return `${index + 1}. ${type}`;
  }).join('\n');
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

function getEvidenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    shipping_time: '发货时间',
    customer_promise: '客户承诺',
    refund_node: '退款节点',
    violation_speech: '违规话术'
  };
  return labels[type] || type;
}

function getRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  };
  return labels[level] || level;
}

export function generateChangeLog(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  const changes: string[] = [];
  
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      if (oldLines[i] && !newLines[i]) {
        changes.push(`删除第 ${i + 1} 行："${oldLines[i].substring(0, 50)}..."`);
      } else if (!oldLines[i] && newLines[i]) {
        changes.push(`新增第 ${i + 1} 行："${newLines[i].substring(0, 50)}..."`);
      } else {
        changes.push(`修改第 ${i + 1} 行`);
      }
    }
  }
  
  if (changes.length === 0) {
    return '无内容修改';
  }
  
  return changes.join('；');
}
