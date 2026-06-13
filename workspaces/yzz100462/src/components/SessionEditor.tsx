import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { FeedingSession, ConflictAlert } from '@/types';
import { useAppStore } from '@/store';
import { todayISO, uid } from '@/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: FeedingSession | null;
  defaultDate?: string;
  defaultExhibitId?: string;
  defaultStartTime?: string;
}

type FormState = Omit<FeedingSession, 'id'>;

const emptyForm = (date: string, exhibitId?: string): FormState => ({
  date,
  startTime: '10:00',
  endTime: '10:30',
  speciesId: '',
  feedId: '',
  feedAmountGrams: 0,
  keeperId: '',
  guideId: null,
  exhibitId: exhibitId || '',
  isVisitorVisible: true,
  status: 'scheduled',
});

export default function SessionEditor({ open, onClose, editing, defaultDate, defaultExhibitId, defaultStartTime }: Props) {
  const exhibits = useAppStore((s) => s.exhibits);
  const species = useAppStore((s) => s.species);
  const feeds = useAppStore((s) => s.feeds);
  const keepers = useAppStore((s) => s.keepers);
  const guides = useAppStore((s) => s.guides);
  const addFeedingSession = useAppStore((s) => s.addFeedingSession);
  const updateFeedingSession = useAppStore((s) => s.updateFeedingSession);
  const detectConflictsFor = useAppStore((s) => s.detectConflictsFor);

  const [form, setForm] = useState<FormState>(emptyForm(defaultDate || todayISO(), defaultExhibitId));
  const [alerts, setAlerts] = useState<ConflictAlert[]>([]);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          date: editing.date,
          startTime: editing.startTime,
          endTime: editing.endTime,
          speciesId: editing.speciesId,
          feedId: editing.feedId,
          feedAmountGrams: editing.feedAmountGrams,
          keeperId: editing.keeperId,
          guideId: editing.guideId,
          exhibitId: editing.exhibitId,
          isVisitorVisible: editing.isVisitorVisible,
          status: editing.status,
        });
      } else {
        setForm(emptyForm(defaultDate || todayISO(), defaultExhibitId));
      }
      setSubmitMsg(null);
    }
  }, [open, editing, defaultDate, defaultExhibitId, defaultStartTime]);

  useEffect(() => {
    if (!form.speciesId || !form.feedId || !form.keeperId || !form.exhibitId) {
      setAlerts([]);
      return;
    }
    const session: FeedingSession = { ...form, id: editing?.id || uid() };
    setAlerts(detectConflictsFor(session, editing?.id));
  }, [form, editing, detectConflictsFor]);

  const speciesInExhibit = useMemo(
    () => species.filter((s) => !form.exhibitId || s.exhibitId === form.exhibitId),
    [species, form.exhibitId],
  );

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'speciesId') {
        const sp = species.find((x) => x.id === v);
        if (sp) {
          next.exhibitId = sp.exhibitId;
          next.feedAmountGrams = sp.defaultFeedAmountGrams;
        }
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!form.exhibitId || !form.speciesId || !form.feedId || !form.keeperId) {
      setSubmitMsg('请填写展区、物种、饲料和饲养员');
      return;
    }
    if (editing) {
      const res = updateFeedingSession(editing.id, form);
      if (!res.success) {
        setSubmitMsg('存在无法保存的错误冲突：' + res.conflicts.map((c) => c.message).join('；'));
        return;
      }
    } else {
      const res = addFeedingSession(form);
      if (!res.success) {
        setSubmitMsg('存在无法保存的错误冲突：' + res.conflicts.map((c) => c.message).join('；'));
        return;
      }
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-ocean-100 flex items-center justify-between">
          <h3 className="section-title">{editing ? '编辑场次' : '新增投喂/讲解场次'}</h3>
          <button onClick={onClose} className="btn-ghost !p-2"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">日期</label>
              <input type="date" className="input" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div>
              <label className="label">展区</label>
              <select className="input" value={form.exhibitId} onChange={(e) => update('exhibitId', e.target.value)}>
                <option value="">请选择展区</option>
                {exhibits.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">开始时间</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} />
            </div>
            <div>
              <label className="label">结束时间</label>
              <input type="time" className="input" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">物种</label>
              <select className="input" value={form.speciesId} onChange={(e) => update('speciesId', e.target.value)}>
                <option value="">请选择物种</option>
                {speciesInExhibit.map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">饲料</label>
              <select className="input" value={form.feedId} onChange={(e) => update('feedId', e.target.value)}>
                <option value="">请选择饲料</option>
                {feeds.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">投喂量 ({feeds.find((f) => f.id === form.feedId)?.unit || 'g'})</label>
              <input type="number" min="0" className="input" value={form.feedAmountGrams} onChange={(e) => update('feedAmountGrams', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">饲养员</label>
              <select className="input" value={form.keeperId} onChange={(e) => update('keeperId', e.target.value)}>
                <option value="">请选择饲养员</option>
                {keepers.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">讲解员（可选）</label>
              <select className="input" value={form.guideId || ''} onChange={(e) => update('guideId', e.target.value || null)}>
                <option value="">无需讲解</option>
                {guides.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-ocean-700">
                <input
                  type="checkbox"
                  checked={form.isVisitorVisible}
                  onChange={(e) => update('isVisitorVisible', e.target.checked)}
                  className="w-4 h-4 text-ocean-600 border-ocean-300 rounded"
                />
                游客可见场次（海报引用、观众围观）
              </label>
            </div>
            <div className="col-span-2">
              <label className="label">状态</label>
              <select className="input" value={form.status} onChange={(e) => update('status', e.target.value as any)}>
                <option value="scheduled">已排期</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="rounded-xl border border-coral-200 bg-coral-50/60 p-4 space-y-2">
              <p className="text-xs font-semibold text-coral-700 uppercase tracking-wide">冲突检测</p>
              <ul className="space-y-1.5">
                {alerts.map((a) => (
                  <li key={a.id} className={`text-sm ${a.severity === 'error' ? 'text-coral-700' : 'text-amber-700'}`}>
                    <span className="font-medium">[{a.severity === 'error' ? '错误' : '警告'}]</span> {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitMsg && (
            <div className="rounded-xl bg-coral-100 text-coral-800 p-3 text-sm">{submitMsg}</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-ocean-100 flex justify-end gap-2 bg-ocean-50/50">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSubmit}>
            {editing ? '保存修改' : '创建场次'}
          </button>
        </div>
      </div>
    </div>
  );
}
