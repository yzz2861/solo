import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Droplets, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useIrrigationStore } from '../store/irrigationStore';
import { clsx } from 'clsx';

interface Props {
  onSaved?: () => void;
}

const BackfillForm = ({ onSaved }: Props) => {
  const { records, todayDate, backfillActual, refreshRecords } = useIrrigationStore();

  const todayRec = records.find((r) => r.date === todayDate);
  const [date, setDate] = useState(todayDate);
  const [actual, setActual] = useState<string>(
    todayRec?.actualIrrigation !== null && todayRec?.actualIrrigation !== undefined
      ? String(todayRec.actualIrrigation)
      : ''
  );
  const [note, setNote] = useState(todayRec?.note ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const rec = records.find((r) => r.date === date);
    setActual(
      rec?.actualIrrigation !== null && rec?.actualIrrigation !== undefined
        ? String(rec.actualIrrigation)
        : ''
    );
    setNote(rec?.note ?? '');
    setSaved(false);
  }, [date, records]);

  const handleSave = () => {
    const raw = actual.trim();
    const num = raw === '' ? null : Number(raw);
    const val = num !== null && Number.isFinite(num) ? num : null;
    backfillActual(date, val, note);
    setSaved(true);
    refreshRecords();
    onSaved?.();
    setTimeout(() => setSaved(false), 2500);
  };

  const suggested = records.find((r) => r.date === date)?.result.grossIrrigation;
  const actualNum = actual.trim() !== '' ? Number(actual) : null;

  const recentDates = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-5 sm:p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-water-gradient text-white flex items-center justify-center">
          <Droplets className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold text-greenhouse-800">
            回填实际灌水量
          </h3>
          <p className="text-sm text-greenhouse-500">
            回填后下周就能看建议 vs 实际的偏差分析
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-greenhouse-800 block mb-1.5">
              选择日期
            </label>
            <input
              type="date"
              value={date}
              max={todayDate}
              onChange={(e) => setDate(e.target.value)}
              className="input-base"
            />
            {recentDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recentDates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setDate(d.date)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded-md transition-all',
                      date === d.date
                        ? 'bg-greenhouse-600 text-white'
                        : 'bg-greenhouse-50 text-greenhouse-700 hover:bg-greenhouse-100'
                    )}
                  >
                    {d.date.slice(5)}
                    {d.actualIrrigation !== null ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-greenhouse-800 block mb-1.5">
              实际灌水量 (mm)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="例如：4.5"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="input-base pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-greenhouse-500 font-medium">
                mm
              </span>
            </div>
            {suggested !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-greenhouse-500 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>当天建议 {suggested.toFixed(1)} mm</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-greenhouse-800 block mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            备注
          </label>
          <input
            type="text"
            placeholder="例如：今天下小雨 / 滴灌2小时 / 下雨了少浇"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-base"
          />
        </div>

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button type="button" onClick={handleSave} className="btn-primary">
            {saved ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                保存成功
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                保存记录
              </>
            )}
          </button>
          {actualNum !== null && suggested !== undefined && (
            <span className="text-sm text-greenhouse-600">
              {(() => {
                const diff = actualNum - suggested;
                const pct = suggested > 0 ? (diff / suggested) * 100 : 0;
                const pctRounded = Math.round(pct);
                if (Math.abs(pctRounded) <= 5) return '✓ 偏差很小，执行到位';
                return diff > 0
                  ? `⚠️ 比建议多 ${pctRounded}%`
                  : `💧 比建议少 ${Math.abs(pctRounded)}%`;
              })()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BackfillForm;
