import { NamingItem, Attachment } from '@/types';

function toCSVValue(val: string | number): string {
  const str = String(val ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportContext {
  complaintNo: string;
  customerInfo: string;
  scenario: string;
  globalOrderNo: string;
  createdAt: string;
  items: NamingItem[];
  attachments: Attachment[];
  missingMaterials: Array<{ name: string; status: string; isRequired: boolean; description: string }>;
}

export function exportNamingCSV(ctx: ExportContext): Blob {
  const header = ['序号', '新文件名', '材料类型', '订单号', '原始文件名', '文件大小(KB)', '对应附件ID'];
  const rows = ctx.items
    .sort((a, b) => a.sequence - b.sequence)
    .map((it) => [
      it.sequence,
      it.newFileName,
      materialTypeLabel(it.materialType),
      it.orderNo || '-',
      it.originalName,
      (it.fileSize / 1024).toFixed(1),
      it.attachmentId,
    ]);

  const lines = [
    `# 投诉附件命名清单`,
    `# 投诉编号: ${ctx.complaintNo || '-'}`,
    `# 客户信息: ${ctx.customerInfo || '-'}`,
    `# 投诉场景: ${ctx.scenario || '-'}`,
    `# 关联订单号: ${ctx.globalOrderNo || '-'}`,
    `# 生成时间: ${new Date().toLocaleString('zh-CN')}`,
    `# 共 ${ctx.items.length} 个附件`,
    '',
    header.map(toCSVValue).join(','),
    ...rows.map((r) => r.map(toCSVValue).join(',')),
  ];

  if (ctx.missingMaterials.length > 0) {
    lines.push('');
    lines.push('--- 待补充材料清单 ---');
    lines.push(['材料名称', '是否必备', '当前状态', '说明'].map(toCSVValue).join(','));
    ctx.missingMaterials.forEach((m) => {
      lines.push([
        m.name,
        m.isRequired ? '是' : '否',
        m.status,
        m.description,
      ].map(toCSVValue).join(','));
    });
  }

  return new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

export function exportMappingJSON(ctx: ExportContext): Blob {
  const mapping = {
    meta: {
      complaintNo: ctx.complaintNo,
      customerInfo: ctx.customerInfo,
      scenario: ctx.scenario,
      globalOrderNo: ctx.globalOrderNo,
      createdAt: ctx.createdAt,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    attachments: ctx.attachments.map((a) => ({
      id: a.id,
      originalName: a.originalName,
      fileType: a.fileType,
      fileSize: a.fileSize,
      ocrText: a.ocrText,
      description: a.description,
    })),
    namingMap: ctx.items.map((it) => ({
      attachmentId: it.attachmentId,
      originalName: it.originalName,
      newFileName: it.newFileName,
      sequence: it.sequence,
      materialType: it.materialType,
      orderNo: it.orderNo,
    })),
    missingMaterials: ctx.missingMaterials,
  };
  return new Blob([JSON.stringify(mapping, null, 2)], { type: 'application/json;charset=utf-8;' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function materialTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CHAT_SCREENSHOT: '聊天截图',
    INSPECTION_REPORT: '检测报告',
    EXPRESS_PHOTO: '快递照片',
    PURCHASE_PROOF: '购买凭证',
    PRODUCT_PHOTO: '商品照片',
    RETURN_FORM: '退换货单',
    OTHER: '其他材料',
    UNKNOWN: '未识别',
  };
  return map[type] || type;
}

export function suggestFileNameForComplaint(complaintNo: string): string {
  const safe = complaintNo || '未命名投诉';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${safe}-${date}`;
}
