import React from 'react';
import {
  ClipboardList,
  Wrench,
  ShieldCheck,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import type { Hazard, HazardStatus } from '@/types';

interface Props {
  hazard: Hazard;
}

interface Step {
  key: 'register' | 'rectify' | 'review' | 'close';
  label: string;
  icon: typeof ClipboardList;
  status: 'done' | 'active' | 'pending';
}

const stepOrder: Step['key'][] = ['register', 'rectify', 'review', 'close'];

export const StatusTimeline: React.FC<Props> = ({ hazard }) => {
  const computeStepStatus = (key: Step['key']): Step['status'] => {
    const statusMap: Record<HazardStatus, Record<Step['key'], Step['status']>> = {
      PENDING_RECTIFICATION: {
        register: 'done',
        rectify: 'active',
        review: 'pending',
        close: 'pending',
      },
      REJECTED: {
        register: 'done',
        rectify: 'active',
        review: 'done',
        close: 'pending',
      },
      PENDING_REVIEW: {
        register: 'done',
        rectify: 'done',
        review: 'active',
        close: 'pending',
      },
      CLOSED: {
        register: 'done',
        rectify: 'done',
        review: 'done',
        close: 'done',
      },
    };
    return statusMap[hazard.status][key];
  };

  const stepConfigs: Record<Step['key'], Omit<Step, 'status'>> = {
    register: { key: 'register', label: '安全员登记', icon: ClipboardList },
    rectify: { key: 'rectify', label: '电工整改', icon: Wrench },
    review: { key: 'review', label: '复查验收', icon: ShieldCheck },
    close: { key: 'close', label: '已关闭', icon: Lock },
  };

  const steps: Step[] = stepOrder.map((k) => ({
    ...stepConfigs[k],
    status: computeStepStatus(k),
  }));

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between gap-2 relative">
        <div
          className="absolute top-[22px] left-[22px] right-[22px] h-0.5
                     bg-industrial-gray-200 z-0"
        />
        {steps.slice(0, -1).map((s, i) => {
          const next = steps[i + 1];
          const connectorDone =
            s.status === 'done' && next.status !== 'pending';
          return (
            <div
              key={`conn-${s.key}`}
              className={`absolute top-[22px] h-0.5 z-10 transition-all ${
                connectorDone ? 'bg-success-green' : 'bg-industrial-gray-200'
              }`}
              style={{
                left: `${(i + 0.5) * 25 + 3}%`,
                right: `${(3 - i - 1.5) * 25 + 3}%`,
              }}
            />
          );
        })}

        {steps.map((s) => {
          const Icon = s.icon;
          const base =
            'relative z-20 flex flex-col items-center gap-2 flex-1 min-w-0';
          const circleCls =
            s.status === 'done'
              ? 'bg-success-green text-white border-success-green shadow-[0_0_0_4px_rgba(22,163,74,0.12)]'
              : s.status === 'active'
              ? 'bg-safety-orange text-white border-safety-orange shadow-[0_0_0_6px_rgba(255,107,53,0.12)] animate-pulse-slow'
              : 'bg-white text-industrial-gray-400 border-industrial-gray-300';

          return (
            <div key={s.key} className={base}>
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${circleCls}`}
              >
                {s.status === 'done' ? (
                  <CheckCircle2 size={22} strokeWidth={2.6} />
                ) : (
                  <Icon size={20} strokeWidth={2.2} />
                )}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  s.status === 'pending'
                    ? 'text-industrial-gray-400'
                    : 'text-industrial-gray-700'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
