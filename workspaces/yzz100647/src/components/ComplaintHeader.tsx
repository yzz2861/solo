import { Hash, User, ClipboardList, Search, Tag } from 'lucide-react';
import { useComplaintStore } from '@/store/complaintStore';
import { SCENARIOS, MATERIAL_TYPE_LABELS } from '@/types';
import { detectScenario } from '@/utils/materialChecker';
import { findGlobalOrderNo } from '@/utils/recognitionEngine';

export default function ComplaintHeader() {
  const cmp = useComplaintStore((s) => s.getComplaint());
  const setField = useComplaintStore((s) => s.setComplaintField);
  const setScenario = useComplaintStore((s) => s.setScenario);
  const runRecognition = useComplaintStore((s) => s.runRecognition);
  const recognitionStatus = useComplaintStore((s) => s.recognitionStatus);

  if (!cmp) {
    return (
      <div className="card p-8 text-center text-zinc-400">
        暂无投诉单数据，请先点击「新建投诉单」
      </div>
    );
  }

  const scenarioSuggestion = detectScenario(cmp.recognitions)[0];
  const globalOrderSuggestion = findGlobalOrderNo(cmp.recognitions);

  const statusBadge = {
    DRAFT: { label: '草稿中', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
    CONFIRMED: { label: '已确认命名', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
    EXPORTED: { label: '已导出', cls: 'bg-warn-50 text-warn-700 border-warn-200' },
  }[cmp.status];

  const materialStats = () => {
    const counts: Record<string, number> = {};
    cmp.attachments.forEach((a) => {
      const t = cmp.recognitions[a.id]?.materialType || 'UNKNOWN';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  };
  const stats = materialStats();

  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
            <ClipboardList className="h-4.5 w-4.5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">投诉单信息</h2>
            <p className="text-[11px] text-zinc-500">
              创建于 {new Date(cmp.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {' · '}
              最后修改 {new Date(cmp.updatedAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge border ${statusBadge.cls}`}>{statusBadge.label}</span>
          <button
            onClick={() => runRecognition()}
            disabled={recognitionStatus === 'running' || cmp.attachments.length === 0}
            className="btn-secondary text-[12.5px]"
          >
            <Search className={`h-3.5 w-3.5 ${recognitionStatus === 'running' ? 'animate-spin' : ''}`} />
            {recognitionStatus === 'running' ? '识别中…' : recognitionStatus === 'done' ? '识别完成 ✓' : '一键识别所有'}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-zinc-600">
              <Hash className="h-3.5 w-3.5 text-zinc-400" />
              投诉编号
            </label>
            <input
              className="input"
              placeholder="如 TS-2025-0618-001"
              value={cmp.complaintNo}
              onChange={(e) => setField('complaintNo', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-zinc-600">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              客户信息备注
            </label>
            <input
              className="input"
              placeholder="姓名、平台、联系方式等"
              value={cmp.customerInfo}
              onChange={(e) => setField('customerInfo', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-zinc-600">
              <Tag className="h-3.5 w-3.5 text-zinc-400" />
              全局订单号
              {globalOrderSuggestion && !cmp.globalOrderNo && (
                <span className="ml-1 chip bg-brand-50 text-brand-700 border border-brand-200">
                  建议 {globalOrderSuggestion.orderNo}
                  <button
                    onClick={() => setField('globalOrderNo', globalOrderSuggestion.orderNo)}
                    className="ml-0.5 font-bold hover:underline"
                  >
                    采纳
                  </button>
                </span>
              )}
            </label>
            <input
              className="input font-mono"
              placeholder="留空则按附件提取"
              value={cmp.globalOrderNo}
              onChange={(e) => setField('globalOrderNo', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-zinc-600">
              <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />
              投诉场景
              {scenarioSuggestion && scenarioSuggestion.scenarioKey !== cmp.scenario && (
                <span className="ml-1 chip bg-warn-50 text-warn-700 border border-warn-200">
                  建议 {scenarioSuggestion.scenario}
                </span>
              )}
            </label>
            <select
              className="select"
              value={cmp.scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {SCENARIOS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[12px] text-zinc-500 mr-1">材料分布：</span>
          {Object.entries(stats).length === 0 && (
            <span className="text-[12px] text-zinc-400 italic">暂无附件</span>
          )}
          {Object.entries(stats).map(([t, c]) => (
            <span
              key={t}
              className="chip border border-zinc-200 bg-zinc-25 text-zinc-600"
            >
              {MATERIAL_TYPE_LABELS[t as keyof typeof MATERIAL_TYPE_LABELS] || '未识别'}
              <span className="ml-1 font-semibold text-zinc-800">×{c}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
