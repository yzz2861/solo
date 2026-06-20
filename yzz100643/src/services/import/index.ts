import Papa from 'papaparse';
import type { ArchiveRecord, ArchiveProject, ImportOptions, ImportPreview, FieldType, ExtractedField } from '@/types';
import { generateId, readFileAsText } from '@/utils/common';
import { toSimplified } from '@/utils/chinese';
import { extractFields, extractPageNumberFromFilename } from '@/services/extractor';

const defaultImportOptions: ImportOptions = {
  hasHeader: true,
  encoding: 'utf-8',
  delimiter: ',',
  dateFormat: 'YYYY-MM-DD'
};

export const parseCSV = async (
  file: File,
  options: ImportOptions = {}
): Promise<{ headers: string[]; data: Record<string, string>[] }> => {
  const mergedOptions = { ...defaultImportOptions, ...options };
  const text = await readFileAsText(file, mergedOptions.encoding);
  
  return new Promise((resolve, reject) => {
    Papa.parse(text as any, {
      header: mergedOptions.hasHeader,
      delimiter: mergedOptions.delimiter,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (mergedOptions.hasHeader) {
          resolve({
            headers: results.meta.fields || [],
            data: results.data as Record<string, string>[]
          });
        } else {
          const data = results.data as string[][];
          const headers = data[0]?.map((_, i) => `列${i + 1}`) || [];
          const formattedData = data.map(row => {
            const obj: Record<string, string> = {};
            row.forEach((val, i) => {
              obj[headers[i]] = val;
            });
            return obj;
          });
          resolve({ headers, data: formattedData });
        }
      },
      error: (error: any) => reject(error)
    });
  });
};

export const parseJSON = async (file: File): Promise<Record<string, unknown>[]> => {
  const text = await readFileAsText(file);
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data;
    }
    if (typeof data === 'object' && data !== null) {
      return [data as Record<string, unknown>];
    }
    return [];
  } catch (e) {
    throw new Error('JSON解析失败');
  }
};

export const parseTXT = async (file: File): Promise<string[]> => {
  const text = await readFileAsText(file);
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
};

export const suggestColumnMappings = (headers: string[]): Record<string, FieldType | 'photoPath' | 'ocrText'> => {
  const mappings: Record<string, FieldType | 'photoPath' | 'ocrText'> = {};
  
  const mappingRules: { pattern: RegExp; target: FieldType | 'photoPath' | 'ocrText' }[] = [
    { pattern: /ocr|文本|内容|文字/i, target: 'ocrText' },
    { pattern: /照片|图片|路径|文件|photo|image|path|file/i, target: 'photoPath' },
    { pattern: /姓名|名字|申请人|当事人|name/i, target: 'name' },
    { pattern: /日期|时间|年月日|date|time/i, target: 'date' },
    { pattern: /编号|文号|案号|档号|number|id|no/i, target: 'documentNumber' },
    { pattern: /页码|页数|page/i, target: 'pageNumber' },
    { pattern: /类型|种类|材料|类别|type|category/i, target: 'materialType' }
  ];
  
  for (const header of headers) {
    for (const rule of mappingRules) {
      if (rule.pattern.test(header)) {
        mappings[header] = rule.target;
        break;
      }
    }
  }
  
  return mappings;
};

export const createImportPreview = async (
  file: File,
  options: ImportOptions = {}
): Promise<ImportPreview> => {
  let headers: string[] = [];
  let sampleData: Record<string, string>[] = [];
  let totalRows = 0;
  let fileType: 'csv' | 'json' | 'txt' | 'folder' = 'csv';
  
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv' || extension === 'tsv') {
    fileType = 'csv';
    const result = await parseCSV(file, options);
    headers = result.headers;
    totalRows = result.data.length;
    sampleData = result.data.slice(0, 5);
  } else if (extension === 'json') {
    fileType = 'json';
    const data = await parseJSON(file) as Record<string, string>[];
    headers = data.length > 0 ? Object.keys(data[0]) : [];
    totalRows = data.length;
    sampleData = data.slice(0, 5);
  } else if (extension === 'txt') {
    fileType = 'txt';
    const paragraphs = await parseTXT(file);
    headers = ['序号', 'OCR文本'];
    totalRows = paragraphs.length;
    sampleData = paragraphs.slice(0, 5).map((p, i) => ({
      '序号': (i + 1).toString(),
      'OCR文本': p
    }));
  }
  
  const suggestedMappings = suggestColumnMappings(headers);
  
  return {
    headers,
    sampleData,
    totalRows,
    fileType,
    suggestedMappings
  };
};

export interface ImportMapping {
  ocrText?: string;
  photoPath?: string;
  name?: string;
  date?: string;
  documentNumber?: string;
  pageNumber?: string;
  materialType?: string;
}

export const processImportData = (
  data: Record<string, string>[],
  mapping: ImportMapping,
  projectId: string
): ArchiveRecord[] => {
  const records: ArchiveRecord[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const ocrText = mapping.ocrText ? row[mapping.ocrText] || '' : '';
    const photoPath = mapping.photoPath ? row[mapping.photoPath] || generateDefaultPhotoPath(i) : generateDefaultPhotoPath(i);
    const photoFileName = photoPath.split('/').pop() || `照片_${i + 1}.jpg`;
    
    let fields: ExtractedField[];
    let overallConfidence: number;
    
    try {
      const extraction = extractFields(ocrText, '');
      fields = extraction.fields;
      overallConfidence = extraction.overallConfidence;
    } catch (e) {
      console.error('抽取失败', e);
      fields = [];
      overallConfidence = 0;
    }
    
    if (mapping.name && row[mapping.name]) {
      const nameField = fields.find(f => f.fieldName === 'name');
      if (nameField) {
        nameField.ocrValue = toSimplified(row[mapping.name]);
        nameField.confidence = 0.9;
        nameField.isLowConfidence = false;
        nameField.source = 'import';
      }
    }
    
    if (mapping.date && row[mapping.date]) {
      const dateField = fields.find(f => f.fieldName === 'date');
      if (dateField) {
        dateField.ocrValue = row[mapping.date];
        dateField.confidence = 0.9;
        dateField.isLowConfidence = false;
        dateField.source = 'import';
      }
    }
    
    if (mapping.documentNumber && row[mapping.documentNumber]) {
      const numField = fields.find(f => f.fieldName === 'documentNumber');
      if (numField) {
        numField.ocrValue = row[mapping.documentNumber];
        numField.confidence = 0.9;
        numField.isLowConfidence = false;
        numField.source = 'import';
      }
    }
    
    if (mapping.pageNumber && row[mapping.pageNumber]) {
      const pageField = fields.find(f => f.fieldName === 'pageNumber');
      if (pageField) {
        pageField.ocrValue = row[mapping.pageNumber];
        pageField.confidence = 0.9;
        pageField.isLowConfidence = false;
        pageField.source = 'import';
      }
    }
    
    if (mapping.materialType && row[mapping.materialType]) {
      const typeField = fields.find(f => f.fieldName === 'materialType');
      if (typeField) {
        typeField.ocrValue = row[mapping.materialType];
        typeField.confidence = 0.9;
        typeField.isLowConfidence = false;
        typeField.source = 'import';
      }
    }
    
    const pageNumberFromFile = extractPageNumberFromFilename(photoFileName);
    const pageNumberField = fields.find(f => f.fieldName === 'pageNumber');
    if (pageNumberFromFile && pageNumberField && (!pageNumberField.ocrValue || pageNumberField.confidence < 0.5)) {
      pageNumberField.ocrValue = pageNumberFromFile.toString();
      pageNumberField.confidence = 0.7;
      pageNumberField.isLowConfidence = false;
      pageNumberField.source = 'filename';
    }
    
    const recordId = generateId();
    fields.forEach(f => f.recordId = recordId);
    
    const record: ArchiveRecord = {
      id: recordId,
      projectId,
      photoPath,
      photoFileName,
      ocrText,
      overallConfidence,
      status: 'pending',
      pageNumber: pageNumberFromFile || parseInt(pageNumberField?.ocrValue || '0', 10) || undefined,
      fields,
      hasMissingPage: false,
      hasSameNameWarning: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    records.push(record);
  }
  
  return records;
};

const generateDefaultPhotoPath = (index: number): string => {
  return `photos/照片_${String(index + 1).padStart(4, '0')}.jpg`;
};

export const processPhotoFolder = async (
  files: FileList | File[]
): Promise<{ photoPath: string; photoFileName: string; ocrText: string }[]> => {
  const results: { photoPath: string; photoFileName: string; ocrText: string }[] = [];
  
  const imageFiles = Array.from(files).filter(f => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff'].includes(ext || '');
  });
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    results.push({
      photoPath: `photos/${file.name}`,
      photoFileName: file.name,
      ocrText: ''
    });
  }
  
  return results.sort((a, b) => a.photoFileName.localeCompare(b.photoFileName));
};

export const createProject = (name: string, description?: string): ArchiveProject => {
  return {
    id: generateId(),
    name,
    description,
    recordCount: 0,
    lowConfidenceCount: 0,
    missingPageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'importing',
    progress: 0
  };
};

export const updateProjectStats = (project: ArchiveProject, records: ArchiveRecord[]): ArchiveProject => {
  const lowConfidenceCount = records.filter(r => 
    r.fields.some(f => f.isLowConfidence)
  ).length;
  
  const missingPageCount = records.filter(r => r.hasMissingPage).length;
  
  return {
    ...project,
    recordCount: records.length,
    lowConfidenceCount,
    missingPageCount,
    updatedAt: Date.now(),
    status: records.length > 0 ? 'ready' : 'importing'
  };
};

export default {
  parseCSV,
  parseJSON,
  parseTXT,
  createImportPreview,
  processImportData,
  processPhotoFolder,
  createProject,
  updateProjectStats
};
