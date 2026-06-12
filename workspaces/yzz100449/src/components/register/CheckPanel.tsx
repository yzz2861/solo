import { CheckCircle, XCircle, MinusCircle, Battery, Droplets, ShieldAlert, Smartphone } from 'lucide-react';
import type { FullCheck, CheckResult } from '../../types';

interface Props {
  value: FullCheck;
  onChange: (v: FullCheck) => void;
}

const checkBtn = (v: CheckResult, size = 'md') => {
  const sz = size === 'lg' ? 'h-12 text-base px-4' : 'h-10 text-sm px-3';
  const base = `flex-1 flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all ${sz}`;
  if (v === 'pass') return `${base} bg-emerald-500 text-white shadow-md shadow-emerald-500/30`;
  if (v === 'fail') return `${base} bg-danger-500 text-white shadow-md shadow-rose-500/30`;
  return `${base} bg-slate-100 text-slate-400 hover:bg-slate-200`;
};

function CheckGroup({ label, items, onChange, icon: Icon }: {
  label: string; icon: any;
  items: { key: keyof any; label: string; value: CheckResult }[];
  onChange: (key: keyof any, v: CheckResult) => void;
}) {
  return (
    <div className="card p-5 border-slate-200 bg-gradient-to-br from-white to-slate-50">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
          <Icon size={20} />
        </div>
        <div>
          <div className="font-bold text-slate-800">{label}</div>
          <div className="text-[11px] text-slate-500">点击 PASS / FAIL 判定结果</div>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={String(it.key)}>
            <div className="text-xs text-slate-600 mb-1.5 font-medium">{it.label}</div>
            <div className="flex gap-2">
              <button type="button" className={checkBtn(it.value === 'pass' ? 'pass' : (it.value === 'fail' ? 'fail' : 'pending'))}
                onClick={() => onChange(it.key, 'pass')}>
                <CheckCircle size={16} /> PASS
              </button>
              <button type="button" className={checkBtn(it.value === 'fail' ? 'fail' : (it.value === 'pass' ? 'pass' : 'pending'))}
                onClick={() => onChange(it.key, 'fail')}>
                <XCircle size={16} /> FAIL
              </button>
              <button type="button" className={checkBtn('pending')}
                onClick={() => onChange(it.key, 'pending')}>
                <MinusCircle size={16} /> 待定
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CheckPanel({ value, onChange }: Props) {
  const setScreen = (k: keyof FullCheck['screen'], v: CheckResult) =>
    onChange({ ...value, screen: { ...value.screen, [k]: v } });
  const setBattery = (k: keyof FullCheck['battery'], v: CheckResult | number) =>
    onChange({ ...value, battery: { ...value.battery, [k]: v } });
  const setWater = (k: keyof FullCheck['water'], v: CheckResult) =>
    onChange({ ...value, water: { ...value.water, [k]: v } });
  const setAccount = (k: keyof FullCheck['account'], v: CheckResult) =>
    onChange({ ...value, account: { ...value.account, [k]: v } });

  return (
    <div className="card p-6 space-y-5">
      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-black">2</span>
        四项检测（必选）
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CheckGroup
          label="屏幕检测"
          icon={Smartphone}
          items={[
            { key: 'scratch', label: '表面划痕', value: value.screen.scratch },
            { key: 'crack', label: '玻璃碎裂', value: value.screen.crack },
            { key: 'display', label: '显示异常/坏点', value: value.screen.display },
          ]}
          onChange={(k, v) => setScreen(k as any, v)}
        />

        <div className="card p-5 border-slate-200 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Battery size={20} />
            </div>
            <div>
              <div className="font-bold text-slate-800">电池检测</div>
              <div className="text-[11px] text-slate-500">健康度 + 是否鼓包</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-medium text-slate-600">电池健康度</div>
                <div className={`font-mono font-bold text-sm tabular-nums ${
                  value.battery.health >= 90 ? 'text-emerald-600' :
                  value.battery.health >= 80 ? 'text-warn-600' : 'text-danger-600'
                }`}>{value.battery.health}%</div>
              </div>
              <input type="range" min={0} max={100} value={value.battery.health}
                onChange={(e) => setBattery('health', Number(e.target.value))}
                className="w-full accent-brand-600" />
              <div className="flex gap-2 mt-2">
                {[85, 90, 95, 100].map((n) => (
                  <button key={n} type="button" onClick={() => setBattery('health', n)}
                    className="flex-1 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 hover:bg-brand-100 hover:text-brand-700">
                    {n}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1.5 font-medium">电池鼓包</div>
              <div className="flex gap-2">
                <button type="button" className={checkBtn(value.battery.bulge === 'pass' ? 'pass' : 'pending')}
                  onClick={() => setBattery('bulge', 'pass')}>
                  <CheckCircle size={16} /> 无鼓包
                </button>
                <button type="button" className={checkBtn(value.battery.bulge === 'fail' ? 'fail' : 'pending')}
                  onClick={() => setBattery('bulge', 'fail')}>
                  <XCircle size={16} /> 鼓包
                </button>
              </div>
            </div>
          </div>
        </div>

        <CheckGroup
          label="进水检测"
          icon={Droplets}
          items={[{ key: 'indicator', label: '进水试纸是否变色', value: value.water.indicator }]}
          onChange={(k, v) => setWater(k as any, v)}
        />

        <CheckGroup
          label="账号锁检测"
          icon={ShieldAlert}
          items={[{ key: 'idLoggedOut', label: 'Apple ID / 账号是否已退出', value: value.account.idLoggedOut }]}
          onChange={(k, v) => setAccount(k as any, v)}
        />
      </div>

      {value.account.idLoggedOut !== 'pass' && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3 animate-pulse-slow">
          <ShieldAlert className="text-danger-500 shrink-0 mt-0.5" size={20} />
          <div>
            <div className="font-bold text-danger-600">账号锁未退出 → 禁止入库！</div>
            <div className="text-xs text-rose-600 mt-1">请顾客现场退出 Apple ID / 品牌账号，确保查找我的 iPhone 已关闭。未完成此步骤，入库按钮将始终禁用。</div>
          </div>
        </div>
      )}
    </div>
  );
}
