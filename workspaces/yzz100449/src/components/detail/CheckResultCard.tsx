import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Smartphone,
  Battery,
  Droplets,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import type { RecycleOrder, CheckResult } from '../../types';
import { isCheckCompleted, getFailReasons } from '../../utils/transition';

interface Props {
  order: RecycleOrder;
}

function ResultDot({ value }: { value: CheckResult }) {
  if (value === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
        <CheckCircle2 size={12} /> PASS
      </span>
    );
  }
  if (value === 'fail') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold">
        <XCircle size={12} /> FAIL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
      <MinusCircle size={12} /> 待定
    </span>
  );
}

export default function CheckResultCard({ order }: Props) {
  const check = order.checkResult;
  const completed = isCheckCompleted(check);
  const failReasons = getFailReasons(check);
  const hasFail = failReasons.length > 0;

  const checkList = [
    {
      label: '表面划痕',
      value: check.screen.scratch,
      remark: check.screen.remark,
    },
    {
      label: '玻璃碎裂',
      value: check.screen.crack,
      remark: check.screen.remark,
    },
    {
      label: '显示异常/坏点',
      value: check.screen.display,
      remark: check.screen.remark,
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-soft">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">四项检测详情</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              屏幕 · 电池 · 进水 · 账号锁 检测结果
            </p>
          </div>
        </div>
        <div>
          {completed ? (
            hasFail ? (
              <span className="chip bg-rose-100 text-rose-700 flex items-center gap-1">
                <AlertTriangle size={12} /> {failReasons.length} 项未达标
              </span>
            ) : (
              <span className="chip bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={12} /> 全部合格
              </span>
            )
          ) : (
            <span className="chip bg-amber-100 text-amber-700 flex items-center gap-1">
              <MinusCircle size={12} /> 检测未完成
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">屏幕检测</div>
              <div className="text-[11px] text-slate-500">划痕 · 碎裂 · 显示</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {checkList.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-slate-100"
              >
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                <ResultDot value={item.value} />
              </div>
            ))}
            {check.screen.remark && (
              <div className="p-2.5 rounded-lg bg-amber-50 text-xs text-amber-700 border border-amber-100">
                📝 {check.screen.remark}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Battery size={18} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">电池检测</div>
              <div className="text-[11px] text-slate-500">健康度 · 是否鼓包</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="py-2 px-3 rounded-xl bg-white border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700">电池健康度</span>
                <span
                  className={`font-mono font-bold text-sm tabular-nums ${
                    check.battery.health >= 90
                      ? 'text-emerald-600'
                      : check.battery.health >= 80
                        ? 'text-warn-600'
                        : 'text-danger-600'
                  }`}
                >
                  {check.battery.health}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    check.battery.health >= 90
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                      : check.battery.health >= 80
                        ? 'bg-gradient-to-r from-warn-400 to-warn-600'
                        : 'bg-gradient-to-r from-rose-400 to-rose-600'
                  }`}
                  style={{ width: `${check.battery.health}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>0%</span>
                <span>80%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-slate-100">
              <span className="text-xs font-medium text-slate-700">电池鼓包</span>
              <ResultDot value={check.battery.bulge} />
            </div>
            {check.battery.remark && (
              <div className="p-2.5 rounded-lg bg-amber-50 text-xs text-amber-700 border border-amber-100">
                📝 {check.battery.remark}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Droplets size={18} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">进水检测</div>
              <div className="text-[11px] text-slate-500">进水试纸状态</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-slate-100">
              <span className="text-xs font-medium text-slate-700">试纸是否变色</span>
              <ResultDot value={check.water.indicator} />
            </div>
            {check.water.remark && (
              <div className="p-2.5 rounded-lg bg-amber-50 text-xs text-amber-700 border border-amber-100">
                📝 {check.water.remark}
              </div>
            )}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border-2 bg-gradient-to-br ${
            check.account.idLoggedOut !== 'pass'
              ? 'border-rose-200 from-rose-50/50 to-white'
              : 'border-slate-200 from-white to-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                check.account.idLoggedOut !== 'pass'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-brand-50 text-brand-700'
              }`}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">账号锁检测</div>
              <div className="text-[11px] text-slate-500">
                Apple ID / 品牌账号状态
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div
              className={`flex items-center justify-between py-2 px-3 rounded-xl border ${
                check.account.idLoggedOut !== 'pass'
                  ? 'bg-rose-50/50 border-rose-200'
                  : 'bg-white border-slate-100'
              }`}
            >
              <span className="text-xs font-medium text-slate-700">
                账号是否已退出
              </span>
              <ResultDot value={check.account.idLoggedOut} />
            </div>
            {check.account.idLoggedOut !== 'pass' && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-xs text-rose-700 border border-rose-200 flex items-start gap-1.5">
                <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                <span>入库前必须让顾客退出 Apple ID / 品牌账号，否则无法入库！</span>
              </div>
            )}
            {check.account.remark && (
              <div className="p-2.5 rounded-lg bg-amber-50 text-xs text-amber-700 border border-amber-100">
                📝 {check.account.remark}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasFail && (
        <div className="mt-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={16} className="text-rose-600" />
            <span className="font-bold text-rose-700 text-sm">不合格项目汇总</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {failReasons.map((reason, idx) => (
              <li
                key={idx}
                className="text-xs text-rose-600 flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
          {order.failReasons && order.failReasons.length > 0 && (
            <div className="mt-3 pt-3 border-t border-rose-200/50">
              <div className="text-[11px] text-rose-500 mb-1">系统登记失败原因：</div>
              <div className="flex flex-wrap gap-1.5">
                {order.failReasons.map((r, idx) => (
                  <span
                    key={idx}
                    className="chip bg-white/80 text-rose-600 border border-rose-200 text-[11px]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {order.bargainFailRemark && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="font-bold text-amber-700 text-sm">议价失败备注</span>
          </div>
          <p className="text-xs text-amber-700">{order.bargainFailRemark}</p>
        </div>
      )}
    </div>
  );
}
