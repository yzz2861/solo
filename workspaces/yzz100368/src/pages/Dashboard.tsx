import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileSearch,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Users,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { fetchRecords } from '@/lib/api';
import { StatusBadge } from '@/components/Badges';
import { useAppStore } from '@/store';
import { FIELD_LABELS } from '@shared/types';

export default function Dashboard() {
  const { records, setRecords } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords()
      .then((r) => setRecords(r))
      .finally(() => setLoading(false));
  }, [setRecords]);

  const total = records.length;
  const confirmed = records.filter((r) => r.status === 'confirmed').length;
  const pending = records.filter((r) => r.status !== 'confirmed' && r.status !== 'archived').length;
  const lowConfidenceFields = records.reduce(
    (acc, r) => acc + r.extractions.filter((f) => f.confidence === 'low').length,
    0,
  );

  const stats = [
    {
      label: '今日病历总数',
      value: total,
      delta: '+12%',
      icon: ClipboardCheck,
      color: 'medical',
    },
    {
      label: '已确认归档',
      value: confirmed,
      delta: '+8%',
      icon: FileSearch,
      color: 'life',
    },
    {
      label: '待人工确认',
      value: pending,
      delta: '+3',
      icon: AlertTriangle,
      color: 'warn',
    },
    {
      label: '低把握待复核',
      value: lowConfidenceFields,
      delta: '+5',
      icon: TrendingUp,
      color: 'danger',
    },
  ];

  const recentRecords = records.slice(0, 5);

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 font-serif">今日概览</h1>
        <p className="text-sm text-slate-500 mt-1">
          2026年6月10日 · 社区门诊病历规范提取系统
        </p>
      </header>

      <div className="grid grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const colorMap: any = {
            medical: 'from-medical-500 to-medical-700',
            life: 'from-life-500 to-life-700',
            warn: 'from-warn-500 to-warn-600',
            danger: 'from-danger-500 to-danger-600',
          };
          return (
            <div
              key={s.label}
              className={`bg-white rounded-xl shadow-card p-5 border border-slate-100 animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[s.color]} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-life-600 font-medium flex items-center gap-0.5 bg-life-50 px-1.5 py-0.5 rounded">
                  <ArrowUpRight className="w-3 h-3" />
                  {s.delta}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-semibold text-slate-900 font-serif">{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 font-serif">最近病历</h2>
            <Link to="/records" className="text-sm text-medical-700 hover:text-medical-800 flex items-center gap-0.5">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
            ) : recentRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">暂无病历</div>
            ) : (
              recentRecords.map((r) => (
                <div key={r.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-medical-100 text-medical-700 flex items-center justify-center text-sm font-medium">
                        {r.patient?.name?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {r.patient?.name} · {r.patient?.gender} · {r.patient?.age}岁
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          就诊日期 {r.visitDate} · 共 {r.extractions.length} 项字段
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={r.status} />
                      <Link
                        to={`/record/${r.id}/${r.status === 'uploaded' ? 'extract' : r.status === 'extracted' ? 'confirm' : 'history'}`}
                        className="text-sm text-medical-700 hover:text-medical-800"
                      >
                        查看
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-gradient-to-br from-medical-700 to-medical-900 rounded-xl shadow-card p-6 text-white animate-fade-in-up stagger-5">
            <h3 className="font-serif font-semibold text-lg">快速录入病历</h3>
            <p className="text-sm text-medical-100 mt-1.5 leading-relaxed">
              支持病历照片OCR识别 或 粘贴护士录入稿，一键抽取五大关键字段。
            </p>
            <Link
              to="/upload"
              className="mt-5 inline-flex items-center gap-2 bg-white text-medical-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-medical-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              上传病历
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5 animate-fade-in-up stagger-6">
            <h3 className="font-serif font-semibold text-slate-900 mb-4">质控快捷入口</h3>
            <div className="space-y-2.5">
              <Link to="/qa" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-warn-50 text-warn-600 flex items-center justify-center">
                    <FileSearch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">质控抽查</div>
                    <div className="text-xs text-slate-500">筛查修改字段与病历</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link to="/records" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-life-50 text-life-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">全部病历</div>
                    <div className="text-xs text-slate-500">浏览、搜索与导出</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="bg-warn-50 border border-warn-200 rounded-xl p-4 animate-fade-in-up stagger-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-warn-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-warn-800">注意</div>
                <div className="text-xs text-warn-700 mt-1 leading-relaxed">
                  低把握字段（{Object.values(FIELD_LABELS).join('、')}）务必请护士确认；同一患者多次就诊请勿合并。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
