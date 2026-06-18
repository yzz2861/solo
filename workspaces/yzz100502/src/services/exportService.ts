import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import type { AnalysisResult, SmsRecord, ExportOptions, CategoryType, SeverityLevel } from '../types';
import { CATEGORY_CONFIGS, SEVERITY_CONFIGS } from '../types';
import { privacyService } from './privacyService';
import { timelineService } from './timelineService';

const getCategoryLabel = (category: CategoryType): string => {
  const config = CATEGORY_CONFIGS.find((c) => c.key === category);
  return config?.label || category;
};

const getSeverityLabel = (severity: SeverityLevel): string => {
  const config = SEVERITY_CONFIGS.find((c) => c.key === severity);
  return config?.label || severity;
};

const getSeverityPriority = (severity: SeverityLevel): number => {
  const config = SEVERITY_CONFIGS.find((c) => c.key === severity);
  return config?.priority || 0;
};

export const exportService = {
  sortBySeverity(results: AnalysisResult[]): AnalysisResult[] {
    return [...results].sort((a, b) => {
      if (a.category === 'adverse_reaction' && b.category !== 'adverse_reaction') return -1;
      if (b.category === 'adverse_reaction' && a.category !== 'adverse_reaction') return 1;
      return getSeverityPriority(b.severity) - getSeverityPriority(a.severity);
    });
  },

  generateDoctorList(results: AnalysisResult[], smsList: SmsRecord[]) {
    const sorted = this.sortBySeverity(results);
    const confirmed = sorted.filter((r) => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified');

    return confirmed.map((result) => {
      const sms = smsList.find((s) => s.id === result.smsId);
      return {
        resultId: result.id,
        patientId: sms?.patientId || '',
        patientName: sms?.patientNameMasked || '',
        patientRawName: sms?.patientName || '',
        category: result.category,
        categoryLabel: getCategoryLabel(result.category),
        severity: result.severity,
        severityLabel: getSeverityLabel(result.severity),
        summary: result.summary,
        evidence: result.evidence,
        isAmbiguous: result.isAmbiguous,
        ambiguousReason: result.ambiguousReason,
        sendTime: sms?.sendTime,
        sender: sms?.sender,
        senderRelation: sms?.senderRelation,
        nurseNote: sms?.nurseNote,
        reviewNote: result.reviewNote,
        isAdverseReaction: result.category === 'adverse_reaction',
        priority: result.category === 'adverse_reaction' ? 100 : getSeverityPriority(result.severity),
      };
    });
  },

  exportToExcel(
    results: AnalysisResult[],
    smsList: SmsRecord[],
    options: ExportOptions
  ): Blob {
    const doctorList = this.generateDoctorList(results, smsList);
    
    const data = doctorList.map((item) => {
      const row: Record<string, unknown> = {
        '优先级': item.isAdverseReaction ? '紧急（不良反应）' : item.severityLabel,
        '分类': item.categoryLabel,
        '患者': options.maskPrivacy ? item.patientName : smsList.find(s => s.id === results.find(r => r.id === item.resultId)?.smsId)?.patientName,
        '摘要': item.summary,
        '发送时间': item.sendTime ? timelineService.formatDate(item.sendTime) : '',
        '发送者': item.sender === 'family' ? `家属(${item.senderRelation || ''})` : '患者本人',
        '模糊标记': item.isAmbiguous ? '是' : '否',
      };

      if (item.isAmbiguous && item.ambiguousReason) {
        row['模糊原因'] = item.ambiguousReason;
      }

      if (options.includeEvidence && item.evidence.length > 0) {
        const evidenceText = options.maskPrivacy
          ? item.evidence.map((ev) => privacyService.maskAll(ev, item.patientRawName ? [item.patientRawName] : [])).join(' | ')
          : item.evidence.join(' | ');
        row['原句依据'] = evidenceText;
      }

      if (item.nurseNote) {
        row['护士备注'] = item.nurseNote;
      }

      if (item.reviewNote) {
        row['审核备注'] = item.reviewNote;
      }

      if (options.includeOriginal) {
        const sms = smsList.find((s) => s.id === results.find((r) => r.id === item.resultId)?.smsId);
        if (sms) {
          row['原始短信'] = options.maskPrivacy ? privacyService.maskAll(sms.content, [sms.patientName]) : sms.content;
        }
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '待处理清单');

    const adverseCount = doctorList.filter((d) => d.isAdverseReaction).length;
    const criticalCount = doctorList.filter((d) => d.severity === 'critical').length;
    const highCount = doctorList.filter((d) => d.severity === 'high').length;
    
    const summaryData = [
      { '统计项': '总记录数', '数量': data.length },
      { '统计项': '不良反应（优先处理）', '数量': adverseCount },
      { '统计项': '危急程度', '数量': criticalCount },
      { '统计项': '高度严重', '数量': highCount },
      { '统计项': '导出时间', '数量': timelineService.formatDate(new Date()) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, '统计概览');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  },

  exportToPDF(
    results: AnalysisResult[],
    smsList: SmsRecord[],
    options: ExportOptions
  ): Blob {
    const doctorList = this.generateDoctorList(results, smsList);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('医患随访待处理清单', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`导出时间: ${timelineService.formatDate(new Date())}`, 14, 30);
    doc.text(`总记录数: ${doctorList.length}`, 14, 36);
    
    const adverseCount = doctorList.filter((d) => d.isAdverseReaction).length;
    doc.text(`不良反应: ${adverseCount} 项（置顶优先处理）`, 14, 42);

    let yPosition = 52;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    for (let i = 0; i < doctorList.length; i++) {
      const item = doctorList[i];

      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      if (i === 0 && item.isAdverseReaction) {
        doc.setFillColor(229, 57, 53);
        doc.rect(margin, yPosition - 6, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ 疑似不良反应 - 请优先处理', margin + 2, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 12;
      }

      doc.setFillColor(item.isAdverseReaction ? 255 : 245, item.isAdverseReaction ? 235 : 245, item.isAdverseReaction ? 238 : 245);
      doc.rect(margin, yPosition - 4, contentWidth, item.isAdverseReaction ? 60 : 50, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. [${item.severityLabel}] ${item.categoryLabel}`, margin, yPosition);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`患者: ${item.patientName}`, margin + 2, yPosition + 8);
      doc.text(`时间: ${item.sendTime ? timelineService.formatDate(item.sendTime) : ''}`, margin + 2, yPosition + 14);
      doc.text(`发送者: ${item.sender === 'family' ? `家属(${item.senderRelation || ''})` : '患者本人'}`, margin + 2, yPosition + 20);

      const splitSummary = doc.splitTextToSize(item.summary, contentWidth - 10);
      doc.text('摘要: ' + splitSummary[0], margin + 2, yPosition + 28);
      if (splitSummary.length > 1) {
        for (let j = 1; j < splitSummary.length; j++) {
          doc.text('        ' + splitSummary[j], margin + 2, yPosition + 28 + j * 6);
        }
      }

      let evidenceY = yPosition + 28 + splitSummary.length * 6;
      if (options.includeEvidence && item.evidence.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('原句依据:', margin + 2, evidenceY);
        evidenceY += 6;
        for (const rawEv of item.evidence) {
          const ev = options.maskPrivacy ? privacyService.maskAll(rawEv, item.patientRawName ? [item.patientRawName] : []) : rawEv;
          const splitEv = doc.splitTextToSize(`"${ev}"`, contentWidth - 14);
          for (const line of splitEv) {
            doc.text(line, margin + 4, evidenceY);
            evidenceY += 5;
          }
        }
        doc.setTextColor(0, 0, 0);
      }

      if (item.isAmbiguous && item.ambiguousReason) {
        doc.setTextColor(255, 152, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`⚠ 模糊标记: ${item.ambiguousReason}`, margin + 2, evidenceY + 2);
        doc.setTextColor(0, 0, 0);
        evidenceY += 8;
      }

      yPosition = evidenceY + 12;
    }

    return doc.output('blob');
  },

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getExportFilename(type: 'excel' | 'pdf'): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    return `医患随访待处理清单_${dateStr}_${timeStr}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
  },
};
