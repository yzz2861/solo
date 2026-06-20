import {
  MaterialType,
  MATERIAL_TYPE_SHORT,
  MATERIAL_TYPE_ORDER,
  Attachment,
  RecognitionResult,
  NamingItem,
  AppSettings,
} from '@/types';

function sanitizeFileName(text: string): string {
  return text
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .replace(/\.+$/, '')
    .slice(0, 60);
}

function padSequence(num: number, padding: number): string {
  return String(num).padStart(padding, '0');
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  return filename.substring(idx).toLowerCase();
}

export interface NamingContext {
  attachments: Attachment[];
  recognitions: Record<string, RecognitionResult>;
  globalOrderNo: string;
  settings: AppSettings;
  typeOverride?: Record<string, MaterialType>;
  orderNoOverride?: Record<string, string>;
  sequenceOverride?: Record<string, number>;
  fileNameOverride?: Record<string, string>;
}

export function generateNamingList(ctx: NamingContext): NamingItem[] {
  const {
    attachments,
    recognitions,
    globalOrderNo,
    settings,
    typeOverride = {},
    orderNoOverride = {},
    sequenceOverride = {},
    fileNameOverride = {},
  } = ctx;

  const sorted = [...attachments].sort((a, b) => {
    const seqA = sequenceOverride[a.id];
    const seqB = sequenceOverride[b.id];
    if (seqA !== undefined && seqB !== undefined) return seqA - seqB;
    if (seqA !== undefined) return -1;
    if (seqB !== undefined) return 1;

    const ra = recognitions[a.id];
    const rb = recognitions[b.id];
    const typeA = typeOverride[a.id] ?? ra?.materialType ?? MaterialType.UNKNOWN;
    const typeB = typeOverride[b.id] ?? rb?.materialType ?? MaterialType.UNKNOWN;
    const typeRankA = MATERIAL_TYPE_ORDER.indexOf(typeA);
    const typeRankB = MATERIAL_TYPE_ORDER.indexOf(typeB);
    if (typeRankA !== typeRankB) return typeRankA - typeRankB;

    return (ra?.sortOrder ?? 99) - (rb?.sortOrder ?? 99);
  });

  let seqCounter = 0;
  const items: NamingItem[] = sorted.map((att) => {
    seqCounter += 1;
    const sequence = sequenceOverride[att.id] ?? seqCounter;
    const rec = recognitions[att.id];
    const materialType = typeOverride[att.id] ?? rec?.materialType ?? MaterialType.UNKNOWN;
    const orderNo = sanitizeFileName(
      orderNoOverride[att.id] ?? rec?.extractedOrderNo ?? globalOrderNo ?? '',
    );

    const typeLabel = MATERIAL_TYPE_SHORT[materialType] || '其他';
    const ext = getExtension(att.originalName) || '.jpg';

    let newFileName = fileNameOverride[att.id];
    if (!newFileName) {
      const parts = [
        padSequence(sequence, settings.sequencePadding),
        typeLabel,
      ];
      if (orderNo) parts.push(orderNo);
      newFileName = parts.join('-') + ext;
    }

    return {
      attachmentId: att.id,
      originalName: att.originalName,
      newFileName,
      sequence,
      materialType,
      orderNo,
      fileSize: att.fileSize,
    };
  });

  const hasSeqOverride = Object.keys(sequenceOverride).length > 0;
  if (!hasSeqOverride && items.length > 0) {
    items.forEach((item, idx) => {
      item.sequence = idx + 1;
      const sequence = padSequence(idx + 1, settings.sequencePadding);
      const typeLabel = MATERIAL_TYPE_SHORT[item.materialType] || '其他';
      const ext = getExtension(item.originalName) || '.jpg';
      if (!fileNameOverride[item.attachmentId]) {
        const parts = [sequence, typeLabel];
        if (item.orderNo) parts.push(item.orderNo);
        item.newFileName = parts.join('-') + ext;
      }
    });
  }

  return items;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
