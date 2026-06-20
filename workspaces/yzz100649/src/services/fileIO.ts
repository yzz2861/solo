import type {
  Annotation,
  Article,
  ReviewReport,
  RevisionManifest,
} from '@/types';
import { genId } from '@/utils/id';

export function splitParagraphs(content: string): string[] {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  triggerDownload(blob, filename);
}

export function downloadCSV(rows: string[][], filename: string): void {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const v = String(cell ?? '');
          if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
          return v;
        })
        .join(',')
    )
    .join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], {
    type: 'text/csv;charset=utf-8',
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildRevisionManifest(article: Article): RevisionManifest {
  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    article: {
      id: article.id,
      title: article.title,
      author: article.author,
      source: article.source,
      paragraphCount: article.paragraphs.length,
      content: article.content,
      paragraphs: article.paragraphs,
    },
    annotations: article.annotations.map((a) => ({
      id: a.id,
      originalText: a.originalText,
      paragraphIndex: a.paragraphIndex,
      startChar: a.startChar,
      endChar: a.endChar,
      lineNumber: a.lineNumber,
      category: a.category,
      expressionType: a.expressionType,
      riskLevel: a.riskLevel,
      suggestion: a.suggestion,
      editorStatus: a.editorStatus,
      editorNote: a.editorNote,
      editorRevisedText: a.editorRevisedText,
      editorHandledAt: a.editorHandledAt,
    })),
  };
}

export function buildReviewReport(
  article: Article,
  doctorName: string
): ReviewReport {
  const reviewed = article.annotations.filter(
    (a) => a.doctorDecision !== 'pending'
  );
  return {
    schemaVersion: '1.0',
    reportedAt: new Date().toISOString(),
    doctorName,
    articleId: article.id,
    articleTitle: article.title,
    reviewedAnnotations: article.annotations,
    summary: {
      total: reviewed.length,
      approved: reviewed.filter((a) => a.doctorDecision === 'approved').length,
      needsRewrite: reviewed.filter(
        (a) => a.doctorDecision === 'needs_rewrite'
      ).length,
      deleted: reviewed.filter((a) => a.doctorDecision === 'delete').length,
    },
  };
}

export function parseRevisionManifest(text: string): RevisionManifest | null {
  try {
    const data = JSON.parse(text);
    if (data.schemaVersion === '1.0' && data.article && data.annotations) {
      return data as RevisionManifest;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseReviewReport(text: string): ReviewReport | null {
  try {
    const data = JSON.parse(text);
    if (
      data.schemaVersion === '1.0' &&
      data.articleId &&
      Array.isArray(data.reviewedAnnotations)
    ) {
      return data as ReviewReport;
    }
    return null;
  } catch {
    return null;
  }
}

export function revisionManifestToArticle(
  manifest: RevisionManifest
): Article {
  const content = manifest.article.content ?? '';
  const paragraphs =
    manifest.article.paragraphs ??
    (content ? splitParagraphs(content) : []);

  const annotations: Annotation[] = manifest.annotations.map((a) => ({
    ...a,
    doctorDecision: 'pending',
  }));

  const now = new Date().toISOString();
  return {
    id: manifest.article.id || genId('art'),
    title: manifest.article.title,
    author: manifest.article.author,
    source: manifest.article.source,
    content,
    paragraphs,
    createdAt: now,
    updatedAt: now,
    annotations,
    stage: 'sent_to_doctor',
  };
}

export function applyReviewReportToArticle(
  article: Article,
  report: ReviewReport
): Article {
  const map = new Map(
    report.reviewedAnnotations.map((a) => [a.id, a])
  );
  const newAnnotations = article.annotations.map((ann) => {
    const fromReport = map.get(ann.id);
    if (!fromReport) return ann;
    return {
      ...ann,
      doctorDecision: fromReport.doctorDecision,
      doctorAdvice: fromReport.doctorAdvice,
      doctorName: fromReport.doctorName,
      doctorReviewedAt: fromReport.doctorReviewedAt,
    };
  });
  return {
    ...article,
    annotations: newAnnotations,
    stage: 'doctor_reviewed',
    updatedAt: new Date().toISOString(),
  };
}

export function revisionToCSV(article: Article): string[][] {
  const header = [
    'ID',
    '风险分类',
    '表达类型',
    '风险等级',
    '原句',
    '段落',
    '位置',
    '编辑状态',
    '编辑备注',
    '修改后文案',
    '系统建议',
  ];
  const rows = article.annotations.map((a) => [
    a.id,
    a.category,
    a.expressionType,
    a.riskLevel,
    a.originalText,
    String(a.paragraphIndex + 1),
    a.lineNumber ? `第 ${a.lineNumber} 行` : `${a.startChar}-${a.endChar}`,
    a.editorStatus,
    a.editorNote || '',
    a.editorRevisedText || '',
    a.suggestion,
  ]);
  return [header, ...rows];
}

export function reviewReportToCSV(report: ReviewReport): string[][] {
  const header = [
    'ID',
    '风险分类',
    '原句',
    '医生结论',
    '医生专业意见',
    '医生姓名',
    '审核时间',
  ];
  const rows = report.reviewedAnnotations.map((a) => [
    a.id,
    a.category,
    a.originalText,
    a.doctorDecision,
    a.doctorAdvice || '',
    a.doctorName || '',
    a.doctorReviewedAt || '',
  ]);
  return [header, ...rows];
}
