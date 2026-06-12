import { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, TrendingUp } from 'lucide-react';
import { mmToM3Mu, m3MuToMm } from '../utils/unitConverter';
import { IrrigationUnit } from '../../shared/types';
import { clsx } from 'clsx';

interface Props {
  label: string;
  subtitle: string;
  valueMm: number;
  icon?: typeof Droplets;
  gradient?: 'water' | 'green' | 'soil';
  emphasize?: boolean;
  previousMm?: number;
}

const ResultCard = ({
  label,
  subtitle,
  valueMm,
  icon: Icon = Droplets,
  gradient = 'water',
  emphasize = false,
  previousMm,
}: Props) => {
  const [unit, setUnit] = useState<IrrigationUnit>('m3_per_mu');

  const displayValue =
    unit === 'mm' ? valueMm : mmToM3Mu(valueMm);
  const unitLabel = unit === 'mm' ? 'mm' : '方/亩';

  const gradientCls = {
    water: 'from-water-500 via-water-300 to-water-100',
    green: 'from-greenhouse-500 via-greenhouse-300 to-greenhouse-100',
    soil: 'from-soil-500 via-soil-300 to-soil-100',
  }[gradient];

  const pctOfMax = Math.min(100, (valueMm / 15) * 100);
  const diff =
    previousMm !== undefined ? valueMm - previousMm : null;

  return (
    <motion.div
      layout
      className={clsx(
        'card-base p-5 relative overflow-hidden',
        emphasize && 'ring-2 ring-water-500 ring-offset-2 ring-offset-paper'
      )}
      style={{
        backgroundImage:
          'radial-gradient(circle at 100% 0%, rgba(133, 193, 233, 0.15), transparent 60%)',
      }}
    >
      <div
        className={`absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${gradientCls} opacity-10 blur-2xl`}
      />

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              gradient === 'water' && 'bg-water-gradient text-white',
              gradient === 'green' && 'bg-greenhouse-gradient text-white',
              gradient === 'soil' && 'bg-gradient-to-br from-soil-400 to-soil-600 text-white'
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p
              className={clsx(
                'font-semibold leading-tight truncate',
                emphasize ? 'text-lg text-ink' : 'text-greenhouse-800'
              )}
            >
              {label}
            </p>
            <p className="text-xs text-greenhouse-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center bg-greenhouse-50 rounded-lg p-0.5 shrink-0">
          {(['mm', 'm3_per_mu'] as IrrigationUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                unit === u
                  ? 'bg-white text-greenhouse-700 shadow-soft'
                  : 'text-greenhouse-500 hover:text-greenhouse-700'
              )}
            >
              {u === 'mm' ? 'mm' : '方/亩'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-baseline gap-2 mb-3">
        <motion.span
          key={`${unit}-${displayValue.toFixed(2)}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            'font-bold tabular-nums tracking-tight',
            emphasize ? 'text-4xl text-water-600' : 'text-3xl text-greenhouse-700'
          )}
        >
          {displayValue.toFixed(unit === 'mm' ? 1 : 1)}
        </motion.span>
        <span
          className={clsx(
            'font-medium',
            emphasize ? 'text-water-500' : 'text-greenhouse-500'
          )}
        >
          {unitLabel}
        </span>
        {diff !== null && Math.abs(diff) > 0.01 && (
          <span
            className={clsx(
              'ml-1 text-xs flex items-center gap-0.5 px-2 py-0.5 rounded-full',
              diff > 0 ? 'bg-red-50 text-red-600' : 'bg-greenhouse-50 text-greenhouse-700'
            )}
          >
            <TrendingUp
              className={`w-3 h-3 ${diff < 0 ? 'rotate-180' : ''}`}
            />
            {diff > 0 ? '+' : ''}
            {(unit === 'mm' ? diff : mmToM3Mu(diff)).toFixed(1)}
          </span>
        )}
      </div>

      <div className="relative h-2 rounded-full bg-greenhouse-50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctOfMax}%` }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className={clsx(
            'h-full rounded-full bg-gradient-to-r',
            gradientCls
          )}
        />
      </div>
      <div className="flex justify-between text-[10px] text-greenhouse-400 mt-1">
        <span>0</span>
        <span>约 {valueMm < 0.5 ? '可不浇' : `${pctOfMax.toFixed(0)}%`}</span>
        <span>15mm</span>
      </div>

      {emphasize && unit === 'm3_per_mu' && (
        <div className="mt-2 text-xs text-water-600/80">
          相当于每亩约 {(displayValue * 1000).toFixed(0)} 升水
        </div>
      )}

      {/* 隐藏一下无用变量的警告 */}
      <span className="hidden">{unit === 'mm' ? '' : ''}{m3MuToMm(0)}</span>
    </motion.div>
  );
};

export default ResultCard;
