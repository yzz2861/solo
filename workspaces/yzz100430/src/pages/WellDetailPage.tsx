import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  FlaskConical,
  MessageSquare,
  CloudRain,
  AlertTriangle,
  Droplets,
  Calendar,
  MapPin,
  Copy,
  Check,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useWellStore } from '@/store/useWellStore';
import { MergedRecord, RISK_LABEL } from '@/types/well';
import { clsx } from 'clsx';
import { useState } from 'react';

const RISK_LINE_COLORS = {
  STOP: '#E8505B',
  RETEST: '#F4A259',
  OBSERVE: '#4CAF82',
};

export default function WellDetailPage() {
  const { wellId } = useParams();
  const navigate = useNavigate();
  const { villages, wells, mergedRecords, getWellRecords, thresholds, getAdviceForRecord, hydrateFromStorage } = useWellStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const records = wellId ? getWellRecords(wellId) : [];
  const well = wells.find((w) => w.id === wellId);
  const village = villages.find((v) => v.id === well?.villageId);
  const latest = records[records.length - 1];

  const chartData = useMemo(() => {
    return records.map((r) => ({
      date: r.sampleDate.slice(5),
      硝酸盐: isNaN(r.nitrateMgL) ? null : +r.nitrateMgL.toFixed(2),
      浊度: isNaN(r.turbidityNtu) ? null : +r.turbidityNtu.toFixed(2),
      菌落: isNaN(r.coliformCfu) ? null : +(r.coliformCfu / 10).toFixed(1),
      风险:
        r.riskLevel === 'STOP' ? 100 : r.riskLevel === 'RETEST' ? 50 : 10,
    }));
  }, [records]);

  if (!well || records.length === 0) {
    return (
      <div className="max-w-3xl mx-auto card text-center py-16 fade-in">
        <Droplets className="w-16 h-16 text-primary-200 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-primary-700 mb-2">
          未找到该水井数据
        </h2>
        <p className="text-primary-500 mb-6">
          请返回总览页选择有效水井
        </p>
        <button onClick={() => navigate('/overview')} className="btn-primary">
          返回总览
        </button>
      </div>
    );
  }

  const advice = latest ? getAdviceForRecord(latest) : null;

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/overview')}
            className="flex items-center gap-1 text-primary-500 text-sm mb-2 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 返回总览
          </button>
          <h1 className="font-serif text-3xl font-black text-primary-800 tracking-tight flex items-center gap-3">
            <Droplets className="w-8 h-8 text-primary-500" />
            {well.commonName}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-primary-600 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {village?.name}
            </span>
            <span className="text-primary-300">|</span>
            <span className="font-mono text-xs">官方编号：{well.officialNo}</span>
            <span className="text-primary-300">|</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              共 {records.length} 次检测记录
            </span>
          </div>
        </div>
        {latest && (
          <div
            className={clsx(
              'card-sm border-2 flex items-center gap-3 min-w-[200px]',
              latest.riskLevel === 'STOP' && 'border-danger-300 bg-danger-50/50',
              latest.riskLevel === 'RETEST' && 'border-warn-300 bg-warn-50/50',
              latest.riskLevel === 'OBSERVE' && 'border-safe-300 bg-safe-50/50',
            )}
          >
            <div
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center text-white font-black font-serif text-lg shadow-md',
                latest.riskLevel === 'STOP' && 'bg-danger-500 shadow-danger-500/20',
                latest.riskLevel === 'RETEST' && 'bg-warn-500 shadow-warn-500/20',
                latest.riskLevel === 'OBSERVE' && 'bg-safe-500 shadow-safe-500/20',
              )}
            >
              {latest.riskLevel === 'STOP'
                ? '停'
                : latest.riskLevel === 'RETEST'
                ? '复'
                : '安'}
            </div>
            <div>
              <div className="text-xs text-primary-500">最新状态 · {latest.sampleDate}</div>
              <div
                className={clsx(
                  'font-serif font-bold text-lg',
                  latest.riskLevel === 'STOP' && 'text-danger-700',
                  latest.riskLevel === 'RETEST' && 'text-warn-700',
                  latest.riskLevel === 'OBSERVE' && 'text-safe-700',
                )}
              >
                {RISK_LABEL[latest.riskLevel]}
              </div>
            </div>
          </div>
        )}
      </div>

      {advice && (
        <div className="card border-primary-200 bg-gradient-to-r from-primary-50/40 to-paper">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-primary-500 flex items-center gap-1 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                最新建议（可复制转发）
              </div>
              <p className="text-primary-800 leading-relaxed">
                {advice.finalText}
              </p>
              <div className="mt-3 p-3 rounded-md bg-white/80 border border-primary-100 text-sm text-primary-700">
                <span className="font-semibold text-primary-600 mr-2">📢 转发话术：</span>
                {advice.forwardText}
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(advice.forwardText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="btn-primary shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制话术' : '复制话术'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            三项指标历史趋势
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#E6EEF2" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#95A5A6" fontSize={11} />
              <YAxis stroke="#95A5A6" fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #D9EAF0',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine
                y={thresholds.nitrateStop}
                stroke="#E8505B"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                label={{ value: '硝酸盐限值', fill: '#E8505B', fontSize: 10 }}
              />
              <ReferenceLine
                y={thresholds.turbidityStop}
                stroke="#E8505B"
                strokeDasharray="4 2"
                strokeWidth={1}
                opacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="硝酸盐"
                stroke="#3C8AA3"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const rec = records[props.index];
                  const color = RISK_LINE_COLORS[rec?.riskLevel || 'OBSERVE'];
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                name="硝酸盐 (mg/L)"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="浊度"
                stroke="#F4A259"
                strokeWidth={2.5}
                dot={false}
                name="浊度 (NTU)"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="菌落"
                stroke="#4CAF82"
                strokeWidth={2.5}
                dot={false}
                name="菌落/10 (CFU/mL)"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-primary-500 mt-3">
            圆点颜色代表该次采样的风险评级：红色停用 / 橙色复检 / 绿色安全
          </p>
        </div>

        <div className="card">
          <h3 className="section-title mb-4">
            <Calendar className="w-5 h-5 text-primary-500" />
            检测统计
          </h3>
          <div className="space-y-4">
            {[
              { label: '硝酸盐最高值', v: Math.max(...records.map((r) => r.nitrateMgL).filter(Number.isFinite)) + ' mg/L', color: 'text-primary-600' },
              { label: '浊度最高值', v: Math.max(...records.map((r) => r.turbidityNtu).filter(Number.isFinite)) + ' NTU', color: 'text-warn-600' },
              { label: '菌落最高值', v: Math.round(Math.max(...records.map((r) => r.coliformCfu).filter(Number.isFinite))) + ' CFU/mL', color: 'text-safe-600' },
              { label: '雨后采样次数', v: records.filter((r) => r.postRain).length + ' 次', color: 'text-primary-700' },
              { label: '异味反馈次数', v: records.filter((r) => r.hasOdorFeedback).length + ' 次', color: 'text-warn-700' },
              { label: '最高风险等级', v: RISK_LABEL[records.some((r) => r.riskLevel === 'STOP') ? 'STOP' : records.some((r) => r.riskLevel === 'RETEST') ? 'RETEST' : 'OBSERVE'], color: 'text-danger-700 font-bold' },
            ].map((it) => (
              <div key={it.label} className="flex items-center justify-between border-b border-primary-50 pb-2 last:border-0">
                <span className="text-sm text-primary-600">{it.label}</span>
                <span className={clsx('font-serif font-bold', it.color)}>
                  {it.v.includes('NaN') ? '—' : it.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-6">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          检测时间线
        </h3>
        <div className="relative pl-6">
          <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-primary-200 via-primary-100 to-primary-50" />
          <div className="space-y-6">
            {records
              .slice()
              .reverse()
              .map((r, idx) => (
                <TimelineItem key={r.id} record={r} index={idx} advice={getAdviceForRecord(r)} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  record,
  index,
  advice,
}: {
  record: MergedRecord;
  index: number;
  advice: ReturnType<typeof useWellStore.getState>['getAdviceForRecord'] extends (r: MergedRecord) => infer R ? R : never;
}) {
  const color = RISK_LINE_COLORS[record.riskLevel];
  return (
    <div className="relative">
      <div
        className={clsx(
          'absolute -left-[22px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md',
        )}
        style={{ backgroundColor: color }}
      >
        {record.riskLevel === 'STOP' ? (
          <AlertTriangle className="w-3 h-3 text-white" />
        ) : record.riskLevel === 'RETEST' ? (
          <CloudRain className="w-3 h-3 text-white" />
        ) : (
          <Check className="w-3 h-3 text-white" />
        )}
      </div>
      <div
        className={clsx(
          'card-sm border-l-4 transition-all',
          index === 0 && 'shadow-cardHover',
        )}
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="badge text-white"
                style={{ backgroundColor: color }}
              >
                {RISK_LABEL[record.riskLevel]}
              </span>
              <span className="font-serif font-bold text-primary-800">
                {record.sampleDate}
              </span>
              {record.postRain && (
                <span className="badge bg-primary-100 text-primary-600">
                  <CloudRain className="w-3 h-3" />
                  雨后补采
                </span>
              )}
              {record.sample?.missing && (
                <span className="badge bg-danger-100 text-danger-600">缺采样</span>
              )}
              {record.missingLab && (
                <span className="badge bg-danger-100 text-danger-600">缺化验</span>
              )}
              {record.sample?.note && (
                <span className="badge bg-primary-50 text-primary-600">
                  备注：{record.sample.note}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <InfoBlock
            icon={<Camera className="w-4 h-4" />}
            label="采样信息"
            value={record.sample ? record.sample.photoNo : '缺采样记录'}
            accent="primary"
          />
          <InfoBlock
            icon={<FlaskConical className="w-4 h-4" />}
            label="硝酸盐"
            value={
              isNaN(record.nitrateMgL)
                ? '—'
                : `${record.nitrateMgL.toFixed(2)} mg/L`
            }
            accent={record.exceeds.nitrate ? 'danger' : record.exceeds.nitrateBoundary ? 'warn' : 'safe'}
            highlight={record.exceeds.nitrate || record.exceeds.nitrateBoundary}
          />
          <InfoBlock
            icon={<FlaskConical className="w-4 h-4" />}
            label="浊度"
            value={isNaN(record.turbidityNtu) ? '—' : `${record.turbidityNtu.toFixed(2)} NTU`}
            accent={record.exceeds.turbidity ? 'danger' : record.exceeds.turbidityBoundary ? 'warn' : 'safe'}
            highlight={record.exceeds.turbidity || record.exceeds.turbidityBoundary}
          />
          <InfoBlock
            icon={<FlaskConical className="w-4 h-4" />}
            label="菌落总数"
            value={isNaN(record.coliformCfu) ? '—' : `${Math.round(record.coliformCfu)} CFU/mL`}
            accent={record.exceeds.coliform ? 'danger' : record.exceeds.coliformBoundary ? 'warn' : 'safe'}
            highlight={record.exceeds.coliform || record.exceeds.coliformBoundary}
          />
        </div>

        {record.feedbacks.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-warn-50 border border-warn-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-warn-700 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              村民反馈 ({record.feedbacks.length} 条)
            </div>
            {record.feedbacks.map((f) => (
              <div key={f.id} className="text-sm text-warn-800 pl-1">
                <span className="font-medium">{f.reporter}：</span>
                {f.odorDesc}
                <span className="text-xs text-warn-600 ml-2">({f.reportDate})</span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 rounded-lg bg-primary-50/50 border border-primary-100 text-sm text-primary-800">
          <span className="font-semibold text-primary-600 mr-1.5">建议：</span>
          {advice.finalText}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'primary' | 'danger' | 'warn' | 'safe';
  highlight?: boolean;
}) {
  const colorMap = {
    primary: 'text-primary-500 bg-primary-50',
    danger: 'text-danger-500 bg-danger-50',
    warn: 'text-warn-500 bg-warn-50',
    safe: 'text-safe-500 bg-safe-50',
  };
  return (
    <div
      className={clsx(
        'rounded-lg p-2.5 border',
        colorMap[accent].split(' ')[1],
        highlight ? 'border-current' : 'border-transparent',
      )}
    >
      <div className="flex items-center gap-1 text-[11px] font-medium mb-1 text-primary-500">
        <span className={clsx(colorMap[accent].split(' ')[0])}>{icon}</span>
        {label}
      </div>
      <div
        className={clsx(
          'font-serif font-bold',
          accent === 'danger' && 'text-danger-700',
          accent === 'warn' && 'text-warn-700',
          accent === 'safe' && 'text-primary-800',
          accent === 'primary' && 'text-primary-700',
        )}
      >
        {value}
      </div>
    </div>
  );
}
