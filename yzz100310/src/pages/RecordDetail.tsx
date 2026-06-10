import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '@/components/Layout';
import { useLibraryStore } from '@/store/useLibraryStore';
import {
  StatusBadge,
  AnomalyList,
  ConclusionBadge,
  ReviewStatusBadge,
} from '@/components/StatusBadge';
import type { WaiverConclusion, ProcessedBorrowRecord } from '@/types';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  FileBadge,
  ClipboardList,
  User,
  DollarSign,
  AlertTriangle,
  Save,
  History,
  Clock,
} from 'lucide-react';

export default function RecordDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const record = useLibraryStore((s) => s.getProcessedById(id));
  const updateReview = useLibraryStore((s) => s.updateReview);

  const [reviewer, setReviewer] = useState(record?.review.reviewer ?? '');
  const [reviewOpinion, setReviewOpinion] = useState(record?.review.reviewOpinion ?? '');
  const [waiverConclusion, setWaiverConclusion] = useState<WaiverConclusion>(
    record?.review.waiverConclusion ?? null,
  );
  const [finalWaiverAmount, setFinalWaiverAmount] = useState<string>(
    String(record?.review.finalWaiverAmount ?? 0),
  );
  const [saved, setSaved] = useState(false);

  if (!record) {
    return (
      <Layout>
        <PageHeader title="借阅单不存在" />
        <div className="card p-8 text-center text-primary/50">
          未找到借阅单号「{id}」的记录
          <div className="mt-4">
            <button className="btn btn-outline" onClick={() => navigate('/records')}>
              返回列表
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleSave = () => {
    const amount = Number(finalWaiverAmount) || 0;
    updateReview(id, {
      reviewer,
      reviewOpinion,
      waiverConclusion,
      finalWaiverAmount: Number(amount.toFixed(2)),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePresetConclusion = (c: WaiverConclusion) => {
    setWaiverConclusion(c);
    if (c === 'approved') {
      setFinalWaiverAmount(String(record.waiver?.waiverAmount ?? record.shouldFine));
    } else if (c === 'rejected') {
      setFinalWaiverAmount('0');
    } else if (c === 'partial') {
      const suggested = Number((record.shouldFine / 2).toFixed(2));
      setFinalWaiverAmount(String(suggested));
    }
  };

  const actualFine = Math.max(
    0,
    record.shouldFine - (Number(finalWaiverAmount) || 0),
  );

  return (
    <Layout>
      <PageHeader
        title={`借阅单：${record.borrow.borrowId}`}
        subtitle={record.borrow.bookTitle || '详情与复核'}
        right={
          <button className="btn btn-outline" onClick={() => navigate('/records')}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <InfoCard
          icon={<BookOpen className="w-5 h-5" />}
          title="借出信息"
          rows={[
            ['借阅人', record.borrow.borrower || '—'],
            ['学号/工号', record.borrow.borrowerId || '—'],
            ['书名', record.borrow.bookTitle || '—'],
            ['ISBN', record.borrow.bookIsbn || '—'],
            ['借出日期', record.borrow.borrowDate || '—'],
            ['应还日期', record.borrow.dueDate || '—'],
          ]}
        />
        <InfoCard
          icon={<CalendarCheck className="w-5 h-5" />}
          title="归还信息"
          rows={
            record.returnRecord
              ? [
                  ['归还日期', record.returnRecord.returnDate],
                  ['归还类型', record.returnRecord.returnType === 'normal' ? '正常归还' : '补录'],
                  ['数据来源', record.returnRecord.source],
                  ['逾期天数', `${record.overdueDays} 天`],
                  ['借阅状态', null],
                ]
              : [
                  ['归还状态', '未归还'],
                  ['逾期天数', `${record.overdueDays} 天`],
                  ['借阅状态', null],
                ]
          }
          extra={<StatusBadge status={record.status} />}
        />
        <InfoCard
          icon={<FileBadge className="w-5 h-5" />}
          title="减免申请"
          rows={
            record.waiver
              ? [
                  ['申请单号', record.waiver.applicationId],
                  ['申请人', record.waiver.applicant],
                  ['申请减免', `¥${record.waiver.waiverAmount.toFixed(2)}`],
                  ['申请日期', record.waiver.applyDate],
                  ['减免原因', record.waiver.reason],
                ]
              : [['申请状态', '暂无减免申请']]
          }
          extra={record.waiver ? null : <span className="chip bg-gray-100 text-gray-500">未申请</span>}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="应缴罚金"
          value={`¥${record.shouldFine.toFixed(2)}`}
          tone="primary"
        />
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label={
            <>
              最终减免金额
              <span className="ml-2 text-xs text-primary/40 font-normal">可在下方修改</span>
            </>
          }
          value={`¥${(Number(finalWaiverAmount) || 0).toFixed(2)}`}
          tone="amber"
        />
        <StatCard
          icon={<User className="w-5 h-5" />}
          label="实缴金额（预览）"
          value={`¥${actualFine.toFixed(2)}`}
          tone={actualFine > 0 ? 'red' : 'green'}
        />
      </div>

      {record.anomalies.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />
            异常标记
          </div>
          <AnomalyList anomalies={record.anomalies} />
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 card">
          <div className="card-header">
            <h3 className="font-serif font-semibold text-primary flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5" />
              复核编辑
            </h3>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-primary/60 mb-1.5 font-medium">复核人</label>
                <input
                  className="input"
                  placeholder="请输入复核人姓名"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-primary/60 mb-1.5 font-medium">复核状态</label>
                <div className="pt-2">
                  <ReviewStatusBadge status={record.review.status} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-primary/60 mb-1.5 font-medium">减免结论</label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { v: 'approved', label: '通过' },
                  { v: 'partial', label: '部分减免' },
                  { v: 'rejected', label: '驳回' },
                ] as const).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => handlePresetConclusion(v)}
                    className={`btn btn-sm ${
                      waiverConclusion === v
                        ? v === 'approved'
                          ? 'btn-primary'
                          : v === 'rejected'
                            ? 'btn-danger'
                            : 'btn-accent'
                        : 'btn-outline'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                {waiverConclusion && (
                  <ConclusionBadge conclusion={waiverConclusion} />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-primary/60 mb-1.5 font-medium">
                最终减免金额（元）
              </label>
              <div className="flex items-center gap-2">
                <span className="text-primary/60">¥</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input !w-40"
                  value={finalWaiverAmount}
                  onChange={(e) => setFinalWaiverAmount(e.target.value)}
                />
                {record.waiver && (
                  <span className="text-xs text-primary/50">
                    申请金额：¥{record.waiver.waiverAmount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-primary/60 mb-1.5 font-medium">
                复核意见（{reviewOpinion.length}/500）
              </label>
              <textarea
                className="textarea h-28"
                placeholder="请填写复核意见，说明减免理由或处理情况…"
                maxLength={500}
                value={reviewOpinion}
                onChange={(e) => setReviewOpinion(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm">
                {saved && <span className="text-green-600">✓ 已保存</span>}
              </div>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save className="w-4 h-4" />
                保存复核结论
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-2 card">
          <div className="card-header">
            <h3 className="font-serif font-semibold text-primary flex items-center gap-2">
              <History className="w-4.5 h-4.5" />
              流程时间线
            </h3>
          </div>
          <div className="card-body">
            <Timeline items={buildTimeline(record)} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoCard({
  icon,
  title,
  rows,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string | null][];
  extra?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center text-primary">
              {icon}
            </div>
            <h3 className="font-serif font-semibold text-primary">{title}</h3>
          </div>
          {extra}
        </div>
        <dl className="space-y-1.5 text-sm">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex gap-2">
              <dt className="w-20 shrink-0 text-primary/50 text-xs pt-0.5">{k}</dt>
              <dd className="flex-1 text-primary/90">{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: string;
  tone: 'primary' | 'amber' | 'green' | 'red';
}) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className="card">
      <div className="card-body flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-primary/55">{label}</div>
          <div className="text-2xl font-bold font-serif text-primary mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}

interface TimelineItem {
  time: string;
  label: string;
  desc?: string;
  tone: 'primary' | 'green' | 'amber' | 'red' | 'gray';
}

function buildTimeline(record: ProcessedBorrowRecord): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (record.borrow.borrowDate) {
    items.push({
      time: record.borrow.borrowDate,
      label: '借出图书',
      desc: `${record.borrow.borrower || '借阅人'} · ${record.borrow.bookTitle || '未知书名'}`,
      tone: 'primary',
    });
  }
  if (record.waiver) {
    items.push({
      time: record.waiver.applyDate,
      label: '提交减免申请',
      desc: `${record.waiver.applicant} 申请减免 ¥${record.waiver.waiverAmount.toFixed(2)}：${record.waiver.reason}`,
      tone: 'amber',
    });
  }
  if (record.returnRecord) {
    items.push({
      time: record.returnRecord.returnDate,
      label: record.returnRecord.returnType === 'normal' ? '正常归还' : '补录归还',
      desc: `来源：${record.returnRecord.source}`,
      tone: record.status === 'overdue_returned' ? 'red' : 'green',
    });
  }
  if (record.review.status === 'reviewed' && record.review.reviewDate) {
    const conclusions: Record<string, string> = {
      approved: '通过',
      rejected: '驳回',
      partial: '部分减免',
    };
    items.push({
      time: record.review.reviewDate,
      label: '复核完成',
      desc: `${record.review.reviewer || '复核人'} · ${
        conclusions[record.review.waiverConclusion || ''] || '无结论'
      } · 减免 ¥${record.review.finalWaiverAmount.toFixed(2)}`,
      tone: 'green',
    });
  }
  return items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <div className="text-center text-primary/40 text-sm py-8">暂无流程记录</div>;
  }
  const toneMap = {
    primary: 'bg-primary',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };
  return (
    <ol className="relative border-l-2 border-border ml-2 space-y-5 py-1">
      {items.map((it, i) => (
        <li key={i} className="ml-5">
          <span
            className={`absolute -left-[7px] w-3 h-3 rounded-full ring-4 ring-background ${toneMap[it.tone]}`}
          />
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-primary/50 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {it.time}
            </span>
            <span className="text-sm font-medium text-primary">{it.label}</span>
          </div>
          {it.desc && <p className="text-xs text-primary/60 mt-1 leading-relaxed">{it.desc}</p>}
        </li>
      ))}
    </ol>
  );
}
