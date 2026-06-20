import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Trash2, ArrowUpRight, FileSpreadsheet, FileJson, Calendar,
  ClipboardList, Package, AlertTriangle, ChevronDown, X, Hash,
  Check, CheckCheck, Download, ExternalLink, Filter,
} from 'lucide-react';
import { useComplaintStore } from '@/store/complaintStore';
import { Complaint, GapStatus, MATERIAL_TYPE_LABELS } from '@/types';
import {
  exportNamingCSV, exportMappingJSON, downloadBlob, suggestFileNameForComplaint,
} from '@/utils/exporters';
import TopNav from '@/components/TopNav';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3600000;
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDate(iso).split(' ')[0];
}

const statusBadge = {
  DRAFT: { label: '草稿', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  CONFIRMED: { label: '已确认', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  EXPORTED: { label: '已导出', cls: 'bg-warn-50 text-warn-700 border-warn-200' },
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const complaints = useComplaintStore((s) => s.complaints);
  const switchComplaint = useComplaintStore((s) => s.switchComplaint);
  const deleteComplaint = useComplaintStore((s) => s.deleteComplaint);

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Complaint['status']>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return complaints
      .filter((c) => filterStatus === 'all' || c.status === filterStatus)
      .filter((c) => {
        if (!q) return true;
        return (
          c.complaintNo.toLowerCase().includes(q) ||
          c.customerInfo.toLowerCase().includes(q) ||
          c.globalOrderNo.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [complaints, query, filterStatus]);

  const detail = detailId ? complaints.find((c) => c.id === detailId) : null;

  const openComplaint = (id: string) => {
    switchComplaint(id);
    navigate('/');
  };

  const exportCmp = (cmp: Complaint, type: 'csv' | 'json' | 'both') => {
    const ctx = {
      complaintNo: cmp.complaintNo,
      customerInfo: cmp.customerInfo,
      scenario: cmp.scenario,
      globalOrderNo: cmp.globalOrderNo,
      createdAt: cmp.createdAt,
      items: cmp.namingList,
      attachments: cmp.attachments,
      missingMaterials: cmp.materialGaps
        .filter((g) => g.status === GapStatus.MISSING)
        .map((g) => ({
          name: g.materialName, status: '待补充', isRequired: g.isRequired, description: g.description,
        })),
    };
    const base = suggestFileNameForComplaint(cmp.complaintNo);
    if (type === 'csv' || type === 'both') {
      downloadBlob(exportNamingCSV(ctx), `${base}-命名清单.csv`);
    }
    if (type === 'json' || type === 'both') {
      setTimeout(() => downloadBlob(exportMappingJSON(ctx), `${base}-完整映射.json`), 300);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="container flex-1 py-5">
        <div className="card animate-fade-in overflow-hidden">
          <div className="card-header flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warn-50">
                <Calendar className="h-4.5 w-4.5 text-warn-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">投诉处理历史记录</h2>
                <p className="text-[11px] text-zinc-500">
                  共 {complaints.length} 条 · 可回溯原始附件与命名映射
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索投诉编号/客户/订单号…"
                  className="input pl-9 py-1.5 w-64 text-[12.5px]"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                {(['all', 'DRAFT', 'CONFIRMED', 'EXPORTED'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilterStatus(k)}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                      filterStatus === k
                        ? 'bg-white text-brand-700 shadow-soft border border-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {k === 'all' ? '全部' : statusBadge[k].label}
                  </button>
                ))}
              </div>
              <button className="btn-secondary text-[12px]">
                <Filter className="h-3.5 w-3.5" />
                高级筛选
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">暂无匹配的投诉记录</p>
              </div>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-zinc-25 text-zinc-500 text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">投诉编号 / 客户</th>
                    <th className="px-3 py-3 text-left font-semibold">关联订单</th>
                    <th className="px-3 py-3 text-left font-semibold">附件</th>
                    <th className="px-3 py-3 text-left font-semibold">材料检查</th>
                    <th className="px-3 py-3 text-left font-semibold">状态</th>
                    <th className="px-3 py-3 text-left font-semibold">更新时间</th>
                    <th className="px-5 py-3 text-right font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => {
                    const missing = c.materialGaps.filter(
                      (g) => g.status === GapStatus.MISSING && g.isRequired,
                    ).length;
                    const materialTypes = new Set(
                      c.attachments.map((a) => c.recognitions[a.id]?.materialType),
                    );
                    return (
                      <tr
                        key={c.id}
                        className={`border-t border-zinc-100 hover:bg-brand-50/30 transition-colors animate-fade-in ${
                          idx === filtered.length - 1 ? '' : ''
                        }`}
                        style={{ animationDelay: `${idx * 20}ms` }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-warn-50 border border-zinc-100 shrink-0">
                              <Hash className="h-4 w-4 text-brand-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-800 flex items-center gap-2">
                                {c.complaintNo || <span className="text-zinc-400 italic">（未编号）</span>}
                                {c.id === useComplaintStore.getState().currentComplaintId && (
                                  <span className="chip bg-brand-100 text-brand-700 text-[10px]">当前</span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[11.5px] text-zinc-500 truncate max-w-[280px]">
                                {c.customerInfo || '无客户备注'}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {[...materialTypes].slice(0, 4).map((t) => t && (
                                  <span key={t} className="chip bg-zinc-100 text-zinc-500 text-[10px]">
                                    {MATERIAL_TYPE_LABELS[t as keyof typeof MATERIAL_TYPE_LABELS]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {c.globalOrderNo ? (
                            <span className="font-mono text-[11.5px] text-zinc-700 bg-zinc-50 rounded border border-zinc-200 px-2 py-0.5">
                              {c.globalOrderNo}
                            </span>
                          ) : (
                            <span className="text-zinc-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="inline-flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="font-semibold text-zinc-700 tabular-nums">{c.attachments.length}</span>
                            <span className="text-zinc-400 text-[11px]">个</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {missing > 0 ? (
                            <span className="inline-flex items-center gap-1 chip bg-danger-50 text-danger-700 border border-danger-200">
                              <AlertTriangle className="h-3 w-3" />
                              {missing} 项必备缺失
                            </span>
                          ) : c.attachments.length > 0 ? (
                            <span className="inline-flex items-center gap-1 chip bg-emerald-50 text-emerald-700">
                              <Check className="h-3 w-3" />
                              材料齐全
                            </span>
                          ) : (
                            <span className="text-zinc-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className={`badge border ${statusBadge[c.status].cls}`}>
                            {c.status === 'CONFIRMED' ? <CheckCheck className="h-3 w-3" /> : c.status === 'EXPORTED' ? <Download className="h-3 w-3" /> : null}
                            {statusBadge[c.status].label}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="text-[12px] text-zinc-600">{relativeDate(c.updatedAt)}</div>
                          <div className="text-[10.5px] text-zinc-400">{formatDate(c.updatedAt)}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailId(c.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                              title="查看命名清单详情"
                            >
                              <ClipboardList className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => exportCmp(c, 'both')}
                              className="p-1.5 rounded-lg text-zinc-400 hover:bg-warn-50 hover:text-warn-700 transition-colors"
                              title="导出全部"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openComplaint(c.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                              title="打开并继续编辑"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`确定删除投诉单 ${c.complaintNo || c.id}？此操作不可撤销`)) {
                                  deleteComplaint(c.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
          onClick={() => setDetailId(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900">
                    {detail.complaintNo || '未编号投诉单'}
                  </h3>
                  <span className={`badge border ${statusBadge[detail.status].cls}`}>
                    {statusBadge[detail.status].label}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-zinc-500">
                  {detail.customerInfo || '无客户备注'} · 创建于 {formatDate(detail.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => exportCmp(detail, 'csv')}
                  className="btn-secondary text-[12px] py-1.5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  onClick={() => exportCmp(detail, 'json')}
                  className="btn-secondary text-[12px] py-1.5"
                >
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </button>
                <button
                  onClick={() => {
                    switchComplaint(detail.id);
                    navigate('/');
                  }}
                  className="btn-primary text-[12px] py-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> 继续编辑
                </button>
                <button
                  onClick={() => setDetailId(null)}
                  className="ml-1 p-2 rounded-lg text-zinc-400 hover:bg-zinc-100"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-b border-zinc-50 bg-zinc-25/50 grid grid-cols-3 gap-4 text-[12px]">
              <InfoCell label="全局订单号" value={detail.globalOrderNo} mono />
              <InfoCell label="附件数量" value={`${detail.attachments.length} 个`} />
              <InfoCell label="命名数" value={`${detail.namingList.length} 项`} />
            </div>
            <div className="flex-1 scroll-y px-6 py-4">
              <h4 className="text-[13px] font-semibold text-zinc-700 mb-3 flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-brand-700" />
                命名清单（质检顺序）
              </h4>
              {detail.namingList.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-zinc-400">该投诉单尚未生成命名清单</div>
              ) : (
                <div className="space-y-1.5">
                  {detail.namingList
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((it) => (
                      <div
                        key={it.attachmentId}
                        className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg bg-white border border-zinc-100 hover:border-brand-200 transition-colors"
                      >
                        <div className="col-span-1 flex justify-center">
                          <div className="h-6 w-6 rounded-full bg-brand-700 text-white flex items-center justify-center text-[11px] font-bold shadow-soft">
                            {it.sequence}
                          </div>
                        </div>
                        <div className="col-span-6 min-w-0">
                          <div className="font-mono text-[12px] font-semibold text-zinc-800 truncate">
                            {it.newFileName}
                          </div>
                          <div className="text-[10.5px] text-zinc-400 truncate">
                            原: {it.originalName}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="chip bg-zinc-100 text-zinc-600 text-[10.5px]">
                            {MATERIAL_TYPE_LABELS[it.materialType]}
                          </span>
                        </div>
                        <div className="col-span-3 font-mono text-[11px] text-zinc-500 truncate text-right">
                          {it.orderNo || '—'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {detail.materialGaps.length > 0 && (
                <>
                  <h4 className="text-[13px] font-semibold text-zinc-700 mt-6 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-warn-600" />
                    材料检查记录
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {detail.materialGaps.map((g) => (
                      <div
                        key={g.id}
                        className={`rounded-lg border px-3 py-2 ${
                          g.status === GapStatus.MISSING
                            ? g.isRequired
                              ? 'border-danger-200 bg-danger-50/40'
                              : 'border-warn-200 bg-warn-50/40'
                            : g.status === GapStatus.MARKED_PROVIDED
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-zinc-200 bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {g.isRequired && <span className="text-[10px] text-danger-600">★必备</span>}
                          <span className="text-[12px] font-medium text-zinc-800">{g.materialName}</span>
                          <span className="ml-auto chip bg-white border border-zinc-200 text-[10px] text-zinc-600">
                            {g.status === GapStatus.MISSING ? '待补充' : g.status === GapStatus.MARKED_PROVIDED ? '已提供' : '免提供'}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-zinc-500 mt-0.5">{g.description}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-25/50 flex justify-between text-[11px] text-zinc-500">
              <span>投诉单 ID：<code className="text-zinc-600">{detail.id}</code></span>
              <button
                onClick={() => setDetailId(null)}
                className="text-brand-700 hover:underline"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-400 uppercase tracking-wider">{label}</div>
      <div className={`mt-0.5 font-medium text-zinc-700 ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-zinc-300">—</span>}
      </div>
    </div>
  );
}
