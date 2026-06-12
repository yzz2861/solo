import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  Home,
  ArrowLeft,
  Droplets,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useWellStore } from '@/store/useWellStore';
import { MergedRecord, RISK_LABEL, RiskLevel } from '@/types/well';
import { clsx } from 'clsx';

const RISK_META: Record<
  RiskLevel,
  {
    icon: React.ReactNode;
    titleClass: string;
    headerClass: string;
    borderClass: string;
    dotBg: string;
  }
> = {
  STOP: {
    icon: <ShieldAlert className="w-6 h-6" />,
    titleClass: 'text-danger-700',
    headerClass: 'bg-gradient-to-r from-danger-500/15 to-danger-400/5 border-danger-200',
    borderClass: 'border-danger-300',
    dotBg: 'bg-danger-500',
  },
  RETEST: {
    icon: <RefreshCw className="w-6 h-6" />,
    titleClass: 'text-warn-700',
    headerClass: 'bg-gradient-to-r from-warn-500/15 to-warn-400/5 border-warn-200',
    borderClass: 'border-warn-300',
    dotBg: 'bg-warn-500',
  },
  OBSERVE: {
    icon: <ShieldCheck className="w-6 h-6" />,
    titleClass: 'text-safe-700',
    headerClass: 'bg-gradient-to-r from-safe-500/15 to-safe-400/5 border-safe-200',
    borderClass: 'border-safe-300',
    dotBg: 'bg-safe-500',
  },
};

export default function VillageReportPage() {
  const { villageId } = useParams();
  const navigate = useNavigate();
  const { villages, mergedRecords, getLatestPerWell, getAdviceForRecord, hydrateFromStorage } = useWellStore();
  const [copiedId, setCopiedId] = useState<string>('');
  const [expandedVillage, setExpandedVillage] = useState<string>('');

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const villageList = villageId === 'all' || !villageId ? villages : villages.filter((v) => v.id === villageId);

  const grouped = useMemo(() => {
    const out = villages.length === 0 ? [] : villageList.map((v) => {
      const latest = getLatestPerWell(v.id);
      const groups = { STOP: [], RETEST: [], OBSERVE: [] } as Record<RiskLevel, MergedRecord[]>;
      latest.forEach((r) => groups[r.riskLevel].push(r));
      return { village: v, groups, latest };
    });
    return out;
  }, [villageList, villages, getLatestPerWell, mergedRecords]);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    }
  };

  if (villages.length === 0) {
    return (
      <div className="max-w-3xl mx-auto card text-center py-16 fade-in">
        <Home className="w-16 h-16 text-primary-200 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-primary-700 mb-2">
          暂无数据
        </h2>
        <p className="text-primary-500 mb-6">请先在数据导入页加载并分析数据</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          前往数据导入页
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-500 text-sm mb-2">
            <button
              onClick={() => navigate('/overview')}
              className="flex items-center gap-1 hover:text-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 返回总览
            </button>
          </div>
          <h1 className="font-serif text-3xl font-black text-primary-800 tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-warn-500" />
            村级用水情况通报
          </h1>
          <p className="text-primary-600 mt-1.5 text-sm">
            以下内容可直接转发给村民，话术已按通俗易懂原则编写
          </p>
        </div>
        <div className="flex items-center gap-2">
          {villageId === 'all' && (
            <button
              onClick={() => {
                const all = villageList.map((v) => {
                  const g = grouped.find((x) => x.village.id === v.id)?.groups;
                  if (!g) return '';
                  const lines: string[] = [`【${v.name} 用水提醒】`];
                  (['STOP', 'RETEST', 'OBSERVE'] as RiskLevel[]).forEach((rk) => {
                    if (g[rk].length === 0) return;
                    const label = RISK_LABEL[rk];
                    const wells = g[rk].map((r) => r.wellCommonName).join('、');
                    lines.push(`${label}：${wells}`);
                  });
                  lines.push('如有疑问请联系村卫生室。');
                  return lines.join('\n');
                }).filter(Boolean).join('\n\n');
                copyText(all, 'all');
              }}
              className="btn-primary shadow-lg shadow-primary-500/20"
            >
              {copiedId === 'all' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedId === 'all' ? '已复制全部' : '一键复制全部通报'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map(({ village, groups, latest }) => {
          const isExpanded = expandedVillage === village.id || villageList.length === 1;
          return (
            <div
              key={village.id}
              className="card overflow-hidden border border-primary-100 p-0"
            >
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-500/10 to-transparent border-b border-primary-100 cursor-pointer"
                onClick={() => setExpandedVillage(isExpanded ? '' : village.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-primary-800">
                      {village.name}
                    </h2>
                    <div className="text-xs text-primary-500 mt-0.5 flex items-center gap-3">
                      <span>共 {latest.length} 口水井</span>
                      {groups.STOP.length > 0 && (
                        <span className="text-danger-600 font-medium">
                          需停用 {groups.STOP.length}
                        </span>
                      )}
                      {groups.RETEST.length > 0 && (
                        <span className="text-warn-600 font-medium">
                          需复检 {groups.RETEST.length}
                        </span>
                      )}
                      {groups.OBSERVE.length > 0 && (
                        <span className="text-safe-600 font-medium">
                          安全 {groups.OBSERVE.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1">
                    <span className={clsx('w-3 h-3 rounded-full', groups.STOP.length > 0 ? 'bg-danger-500' : 'bg-gray-200')} />
                    <span className={clsx('w-3 h-3 rounded-full', groups.RETEST.length > 0 ? 'bg-warn-500' : 'bg-gray-200')} />
                    <span className={clsx('w-3 h-3 rounded-full', groups.OBSERVE.length > 0 ? 'bg-safe-500' : 'bg-gray-200')} />
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-primary-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary-500" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 space-y-5">
                  {(['STOP', 'RETEST', 'OBSERVE'] as RiskLevel[]).map((rk) => {
                    const wells = groups[rk];
                    if (wells.length === 0) return null;
                    const meta = RISK_META[rk];
                    const sampleAdvice = getAdviceForRecord(wells[0]);
                    return (
                      <div
                        key={rk}
                        className={clsx(
                          'rounded-xl border overflow-hidden',
                          meta.borderClass,
                        )}
                      >
                        <div
                          className={clsx(
                            'px-5 py-3 border-b flex items-center justify-between',
                            meta.headerClass,
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={clsx('w-2.5 h-2.5 rounded-full', meta.dotBg)} />
                            <span className={clsx(meta.icon, meta.titleClass)} />
                            <h3 className={clsx('font-serif font-bold text-lg', meta.titleClass)}>
                              {RISK_LABEL[rk]}
                              <span className="ml-2 text-sm font-sans font-medium opacity-70">
                                · {wells.length} 口井
                              </span>
                            </h3>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const names = wells.map((w) => w.wellCommonName).join('、');
                              copyText(sampleAdvice.forwardText, `${village.id}-${rk}`);
                            }}
                            className="btn-secondary !py-1.5 !px-3 text-xs"
                          >
                            {copiedId === `${village.id}-${rk}` ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            复制话术
                          </button>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {wells.map((w) => (
                              <WellCard
                                key={w.id}
                                record={w}
                                risk={rk}
                                adviceText={getAdviceForRecord(w).finalText}
                              />
                            ))}
                          </div>

                          <div className={clsx(
                            'rounded-lg p-4 text-sm',
                            rk === 'STOP' && 'bg-danger-50 border border-danger-100 text-danger-800',
                            rk === 'RETEST' && 'bg-warn-50 border border-warn-100 text-warn-800',
                            rk === 'OBSERVE' && 'bg-safe-50 border border-safe-100 text-safe-800',
                          )}>
                            <div className="font-semibold mb-1.5 flex items-center gap-2">
                              <Droplets className="w-4 h-4" />
                              说明（转发时会自动带入）
                            </div>
                            <p className="leading-relaxed">{sampleAdvice.finalText}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card-sm bg-primary-50/40 border-primary-100 text-xs text-primary-600 leading-relaxed">
        <div className="font-semibold text-primary-700 mb-1">🗨️ 转发注意事项</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>请使用"复制话术"按钮获取官方格式内容，不要自行修改文字</li>
          <li>如村民有疑问，可引导其联系村卫生室，不在群内展开讨论</li>
          <li>避免使用"有毒""污染"等可能引起恐慌的表述</li>
          <li>待卫生院复检结果出来后，会及时更新通报内容</li>
        </ul>
      </div>
    </div>
  );
}

function WellCard({ record, risk, adviceText }: { record: MergedRecord; risk: RiskLevel; adviceText: string }) {
  const meta = RISK_META[risk];
  return (
    <div
      className={clsx(
        'rounded-lg border p-3 bg-white hover:shadow-md transition-all',
        meta.borderClass,
      )}
      title={adviceText}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full shrink-0 mt-1.5', meta.dotBg)} />
          <div>
            <div className="font-serif font-bold text-primary-800 text-base">
              {record.wellCommonName}
            </div>
            <div className="text-[10px] text-primary-400 font-mono mt-0.5">
              {record.sampleDate}
            </div>
          </div>
        </div>
        {record.postRain && (
          <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded">
            雨后
          </span>
        )}
      </div>
      {record.hasOdorFeedback && (
        <div className="text-[11px] text-warn-700 bg-warn-50 px-2 py-1 rounded mb-2">
          有异味反馈：
          {record.feedbacks[0]?.odorDesc || '村干部已上报'}
        </div>
      )}
      {record.missingSample && (
        <div className="text-[11px] text-danger-700 bg-danger-50 px-2 py-1 rounded mb-2">
          缺采样记录，待补采
        </div>
      )}
      {record.missingLab && (
        <div className="text-[11px] text-danger-700 bg-danger-50 px-2 py-1 rounded mb-2">
          缺化验结果，待检测
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
        <div>
          <div className="text-primary-400">硝酸盐</div>
          <div className={clsx(
            'font-semibold',
            record.exceeds.nitrate ? 'text-danger-600' : record.exceeds.nitrateBoundary ? 'text-warn-600' : 'text-ink',
          )}>
            {isNaN(record.nitrateMgL) ? '—' : record.nitrateMgL.toFixed(1)}
            <span className="text-primary-400 ml-0.5">mg/L</span>
          </div>
        </div>
        <div>
          <div className="text-primary-400">浊度</div>
          <div className={clsx(
            'font-semibold',
            record.exceeds.turbidity ? 'text-danger-600' : record.exceeds.turbidityBoundary ? 'text-warn-600' : 'text-ink',
          )}>
            {isNaN(record.turbidityNtu) ? '—' : record.turbidityNtu.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-primary-400">菌落</div>
          <div className={clsx(
            'font-semibold',
            record.exceeds.coliform ? 'text-danger-600' : record.exceeds.coliformBoundary ? 'text-warn-600' : 'text-ink',
          )}>
            {isNaN(record.coliformCfu) ? '—' : Math.round(record.coliformCfu)}
          </div>
        </div>
      </div>
    </div>
  );
}
