import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useProjectStore } from '@/store/projectStore';
import { useRiskStore } from '@/store/riskStore';
import Button from '@/components/ui/Button';
import type { FieldMapping } from '@/types';

const STANDARD_FIELDS: { key: keyof FieldMapping; label: string }[] = [
  { key: 'content', label: '回答内容' },
  { key: 'respondentId', label: '用户ID' },
  { key: 'respondedAt', label: '回答时间' },
];

function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (sa.includes(sb) || sb.includes(sa)) return 0.8;
  const keywords: Record<string, string[]> = {
    content: ['回答', '内容', 'content', 'response', 'answer', 'text', '回复'],
    respondentId: ['用户', 'id', 'user', 'respondent', 'uid', '参与者'],
    respondedAt: ['时间', 'date', 'time', '回答时间', 'timestamp', 'at'],
  };
  const field = STANDARD_FIELDS.find((f) => f.key === a);
  if (field) {
    const kws = keywords[field.key] || [];
    for (const kw of kws) {
      if (sb.includes(kw)) return 0.6;
    }
  }
  return 0;
}

function autoMap(headers: string[]): FieldMapping {
  const mapping: FieldMapping = { content: '', respondentId: '', respondedAt: '' };
  const used = new Set<number>();

  for (const field of STANDARD_FIELDS) {
    let bestIdx = -1;
    let bestScore = 0;
    headers.forEach((h, i) => {
      if (used.has(i)) return;
      const score = similarity(field.key, h);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestScore >= 0.6) {
      mapping[field.key] = headers[bestIdx];
      used.add(bestIdx);
    }
  }

  return mapping;
}

export default function Import() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, loadProjects, setCurrentProject, updateProjectCounts } = useProjectStore();
  const { importResponses } = useRiskStore();

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({ content: '', respondentId: '', respondedAt: '' });
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.id === id) || null;

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project, setCurrentProject]);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    setImportCount(null);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as Record<string, string>[];
          const hdrs = result.meta.fields || [];
          setHeaders(hdrs);
          setRows(data);
          setMapping(autoMap(hdrs));
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        const hdrs = data.length > 0 ? Object.keys(data[0]) : [];
        setHeaders(hdrs);
        setRows(data);
        setMapping(autoMap(hdrs));
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const handleImport = async () => {
    if (!id || !mapping.content) return;
    setIsImporting(true);
    try {
      const count = await importResponses(id, rows, mapping);
      await updateProjectCounts(id);
      setImportCount(count);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  const mappedColumns = new Set(Object.values(mapping).filter(Boolean));

  const previewRows = rows.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/projects')}
              className="text-gray-400 hover:text-[#F59E0B] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-gray-500">{project?.name || 'Project'}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="text-gray-300">Data Import</span>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? 'border-[#F59E0B] bg-[#F59E0B]/5'
              : 'border-[#2A3A5E] bg-[#16213E]/50 hover:border-[#3A4A6E] hover:bg-[#16213E]'
          }`}
        >
          <Upload className={`mb-3 h-10 w-10 ${isDragging ? 'text-[#F59E0B]' : 'text-gray-500'}`} />
          <p className="mb-1 text-sm font-medium text-gray-300">
            {fileName || 'Drag & drop CSV or Excel files here'}
          </p>
          <p className="text-xs text-gray-500">Supports .csv, .xlsx, .xls</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {headers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Field Mapping</h2>
            <div className="overflow-hidden rounded-xl border border-[#1E3A5F] bg-[#16213E]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E3A5F]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Standard Field</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">File Column</th>
                  </tr>
                </thead>
                <tbody>
                  {STANDARD_FIELDS.map((field) => (
                    <tr key={field.key} className="border-b border-[#1E3A5F]/50 last:border-0">
                      <td className="px-4 py-3 text-sm text-gray-300">{field.label}</td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping[field.key]}
                          onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full rounded-lg border border-[#1E3A5F] bg-[#0D1117] px-3 py-1.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/50"
                        >
                          <option value="">-- Not mapped --</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {previewRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-8"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Data Preview</h2>
            <div className="overflow-auto rounded-xl border border-[#1E3A5F] bg-[#16213E] max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0F1B33]">
                    {headers.map((h) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 text-left font-medium whitespace-nowrap ${
                          mappedColumns.has(h) ? 'text-[#F59E0B]' : 'text-gray-400'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-[#1E3A5F]/30 ${i % 2 === 0 ? 'bg-[#16213E]' : 'bg-[#1A2744]'}`}
                    >
                      {headers.map((h) => (
                        <td
                          key={h}
                          className={`px-3 py-2 whitespace-nowrap max-w-[200px] truncate ${
                            mappedColumns.has(h) ? 'text-gray-200' : 'text-gray-500'
                          }`}
                        >
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Showing {Math.min(10, rows.length)} of {rows.length} rows
            </p>
          </motion.div>
        )}

        {rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-8 flex items-center justify-between"
          >
            <div className="text-sm text-gray-400">
              {rows.length} rows ready to import
            </div>
            <Button
              onClick={handleImport}
              disabled={!mapping.content || isImporting}
              loading={isImporting}
              icon={<Upload className="h-4 w-4" />}
            >
              Import
            </Button>
          </motion.div>
        )}

        {importCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              <span className="text-sm text-[#10B981] font-medium">
                {importCount} rows imported successfully
              </span>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showToast && importCount !== null && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#10B981]/25"
            >
              <CheckCircle2 className="h-4 w-4" />
              {importCount} rows imported
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
