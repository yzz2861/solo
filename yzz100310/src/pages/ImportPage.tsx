import { useLibraryStore } from '@/store/useLibraryStore';
import { Layout, PageHeader } from '@/components/Layout';
import { FileUpload } from '@/components/FileUpload';
import { parseCSV, mapBorrowRows, parseReturnJSON, parseWaiverJSON, computeFileHash, generateBatchId } from '@/utils/parsers';
import type { ImportBatch } from '@/types';
import { Clock, Database, Trash2, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useState } from 'react';

const FILE_TYPE_LABELS: Record<ImportBatch['fileType'], string> = {
  borrow: '借阅 CSV',
  return: '还书补录 JSON',
  waiver: '减免申请 JSON',
};

export default function ImportPage() {
  const {
    borrows,
    returns,
    waivers,
    batches,
    processed,
    importBorrows,
    importReturns,
    importWaivers,
    hasFileHash,
    clearAll,
  } = useLibraryStore();
  const [confirmClear, setConfirmClear] = useState(false);

  async function readText(file: File) {
    return new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(new Error('文件读取失败'));
      fr.readAsText(file, 'utf-8');
    });
  }

  async function handleBorrowFile(file: File) {
    const text = await readText(file);
    const hash = await computeFileHash(text);
    if (hasFileHash(hash)) throw new Error('该文件已导入过，请检查是否重复');
    const parsed = parseCSV(text);
    if (parsed.rows.length === 0) throw new Error('CSV 无有效数据行');
    const records = mapBorrowRows(parsed.rows);
    const batch: ImportBatch = {
      batchId: generateBatchId('BRW'),
      fileName: file.name,
      fileType: 'borrow',
      recordCount: records.length,
      importTime: new Date().toISOString(),
      fileHash: hash,
    };
    const n = importBorrows(records, batch);
    if (n === 0) throw new Error(`未导入新记录（${records.length} 条均为重复借阅单号）`);
  }

  async function handleReturnFile(file: File) {
    const text = await readText(file);
    const hash = await computeFileHash(text);
    if (hasFileHash(hash)) throw new Error('该文件已导入过，请检查是否重复');
    const records = parseReturnJSON(text);
    if (records.length === 0) throw new Error('JSON 无有效记录');
    const batch: ImportBatch = {
      batchId: records[0]?.batchId ?? generateBatchId('RET'),
      fileName: file.name,
      fileType: 'return',
      recordCount: records.length,
      importTime: new Date().toISOString(),
      fileHash: hash,
    };
    const n = importReturns(records, batch);
    if (n === 0) throw new Error('未导入新记录（全部重复）');
  }

  async function handleWaiverFile(file: File) {
    const text = await readText(file);
    const hash = await computeFileHash(text);
    if (hasFileHash(hash)) throw new Error('该文件已导入过，请检查是否重复');
    const records = parseWaiverJSON(text);
    if (records.length === 0) throw new Error('JSON 无有效记录');
    const batch: ImportBatch = {
      batchId: records[0]?.batchId ?? generateBatchId('WV'),
      fileName: file.name,
      fileType: 'waiver',
      recordCount: records.length,
      importTime: new Date().toISOString(),
      fileHash: hash,
    };
    const n = importWaivers(records, batch);
    if (n === 0) throw new Error('未导入新记录（全部重复）');
  }

  const anomalyCount = processed.filter((p) => p.anomalies.length > 0).length;
  const pendingReview = processed.filter((p) => p.review.status === 'pending').length;

  return (
    <Layout>
      <PageHeader
        title="数据导入"
        subtitle="上传借阅 CSV、还书补录 JSON、减免申请 JSON，系统按借阅单号自动关联"
        right={
          <button
            onClick={() => setConfirmClear(true)}
            className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空所有数据
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Database className="w-5 h-5" />} label="借阅记录" value={borrows.length} tone="primary" />
        <StatCard icon={<FileSpreadsheet className="w-5 h-5" />} label="还书补录" value={returns.length} tone="green" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="减免申请" value={waivers.length} tone="amber" />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="异常 / 待复核"
          value={`${anomalyCount} / ${pendingReview}`}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <FileUpload
          fileType="borrow"
          label="借阅数据 (CSV)"
          description="包含借阅单号、借阅人、书名、借出/应还日期、日罚金等"
          accept=".csv"
          onFileSelect={handleBorrowFile}
        />
        <FileUpload
          fileType="return"
          label="还书补录 (JSON)"
          description="按借阅单号补录实际归还日期，用于修正逾期状态"
          accept=".json"
          onFileSelect={handleReturnFile}
        />
        <FileUpload
          fileType="waiver"
          label="减免申请 (JSON)"
          description="按借阅单号提交的罚金减免申请，含申请人与金额"
          accept=".json"
          onFileSelect={handleWaiverFile}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-serif font-semibold text-primary">导入历史记录</h2>
        </div>
        <div className="card-body">
          {batches.length === 0 ? (
            <div className="text-center text-primary/40 py-10 text-sm">
              暂无导入记录，上传文件后将显示在此处
            </div>
          ) : (
            <div className="space-y-2">
              {[...batches]
                .sort((a, b) => (a.importTime < b.importTime ? 1 : -1))
                .map((b) => (
                  <div
                    key={b.batchId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/[0.02] transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
                      {b.fileType === 'borrow' ? (
                        <FileSpreadsheet className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                      ) : (
                        <FileText className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary truncate">{b.fileName}</div>
                      <div className="text-xs text-primary/50 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(b.importTime).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <span className="chip bg-primary/10 text-primary">{FILE_TYPE_LABELS[b.fileType]}</span>
                    <span className="chip bg-accent/20 text-accent-dark">{b.recordCount} 条</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="确认清空所有数据？"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setConfirmClear(false)}>
              取消
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
            >
              确认清空
            </button>
          </>
        }
      >
        <p className="text-sm text-primary/70">
          此操作将清除本地存储的所有借阅、归还、减免与复核记录，且无法恢复。
        </p>
      </Modal>
    </Layout>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: 'primary' | 'green' | 'amber' | 'red';
}) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className="card">
      <div className="card-body flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
        <div>
          <div className="text-xs text-primary/55">{label}</div>
          <div className="text-xl font-bold font-serif text-primary mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}
