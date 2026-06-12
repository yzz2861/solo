import { UserRound, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';

export type ReportView = 'farmer' | 'technician';

interface Props {
  value: ReportView;
  onChange: (v: ReportView) => void;
}

const TABS: Array<{ key: ReportView; icon: typeof UserRound; label: string; desc: string }> = [
  {
    key: 'farmer',
    icon: UserRound,
    label: '农户版',
    desc: '说人话、好操作',
  },
  {
    key: 'technician',
    icon: FlaskConical,
    label: '农技员版',
    desc: '保留参数和计算过程',
  },
];

const ReportTabs = ({ value, onChange }: Props) => {
  return (
    <div className="card-base p-2 flex items-stretch gap-2">
      {TABS.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={clsx(
              'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
              active
                ? 'bg-greenhouse-gradient text-white shadow-card'
                : 'text-greenhouse-700 hover:bg-greenhouse-50'
            )}
          >
            <div
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                active ? 'bg-white/20' : 'bg-greenhouse-100'
              )}
            >
              <t.icon className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0">
              <p
                className={clsx(
                  'font-semibold leading-tight',
                  active ? 'text-white' : 'text-greenhouse-800'
                )}
              >
                {t.label}
              </p>
              <p
                className={clsx(
                  'text-xs mt-0.5',
                  active ? 'text-white/80' : 'text-greenhouse-500'
                )}
              >
                {t.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ReportTabs;
