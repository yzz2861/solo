import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Fish, Droplets, Users, Mic2, Landmark } from 'lucide-react';
import { useAppStore } from '@/store';
import { todayISO } from '@/utils';

type TabKey = 'exhibit' | 'species' | 'feed' | 'keeper' | 'guide' | 'water';

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'exhibit', label: '展区', icon: Landmark },
  { key: 'species', label: '物种', icon: Fish },
  { key: 'feed', label: '饲料与库存', icon: Droplets },
  { key: 'keeper', label: '饲养员', icon: Users },
  { key: 'guide', label: '讲解员', icon: Mic2 },
  { key: 'water', label: '水质备注', icon: Droplets },
];

export default function DataEntry() {
  const [tab, setTab] = useState<TabKey>('species');
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl text-ocean-900">数据录入</h2>
        <p className="text-sm text-ocean-600 mt-1">维护基础档案与水质备注，为排班提供可靠数据</p>
      </div>
      <div className="card overflow-hidden">
        <div className="flex border-b border-ocean-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                tab === t.key
                  ? 'border-ocean-600 text-ocean-900 bg-ocean-50/50'
                  : 'border-transparent text-ocean-500 hover:text-ocean-800 hover:bg-ocean-50/40'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'exhibit' && <ExhibitForm />}
          {tab === 'species' && <SpeciesForm />}
          {tab === 'feed' && <FeedForm />}
          {tab === 'keeper' && <KeeperForm />}
          {tab === 'guide' && <GuideForm />}
          {tab === 'water' && <WaterNoteForm />}
        </div>
      </div>
    </div>
  );
}

interface CrudProps<T> {
  items: T[];
  empty: Omit<T, 'id'>;
  renderForm: (v: Omit<T, 'id'>, set: (v: Omit<T, 'id'>) => void) => React.ReactNode;
  renderRow: (item: T) => React.ReactNode;
  onAdd: (v: Omit<T, 'id'>) => void;
  onUpdate: (id: string, v: Partial<T>) => void;
  onDelete: (id: string) => void;
  columns: string[];
  title: string;
}

function CrudTable<T extends { id: string }>({
  items,
  empty,
  renderForm,
  renderRow,
  onAdd,
  onUpdate,
  onDelete,
  columns,
  title,
}: CrudProps<T>) {
  const [form, setForm] = useState<Omit<T, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<T, 'id'> | null>(null);

  const openCreate = () => {
    setForm(empty);
    setEditingId(null);
    setEditForm(null);
  };
  const closeForm = () => {
    setForm(null);
    setEditingId(null);
    setEditForm(null);
  };
  const startEdit = (item: T) => {
    const { id, ...rest } = item as any;
    setEditForm(rest as Omit<T, 'id'>);
    setEditingId(id);
    setForm(null);
  };
  const submitCreate = () => {
    if (!form) return;
    onAdd(form);
    closeForm();
  };
  const submitEdit = () => {
    if (!editingId || !editForm) return;
    onUpdate(editingId, editForm as Partial<T>);
    closeForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title text-lg">{title}</h3>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> 新增
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-ocean-100 text-left text-xs text-ocean-500 uppercase tracking-wide">
              {columns.map((c) => (
                <th key={c} className="py-2.5 px-3 font-medium">{c}</th>
              ))}
              <th className="py-2.5 px-3 w-24 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {form && (
              <tr className="bg-aqua-50/40 border-b border-aqua-100">
                {columns.map((_, idx) => (
                  <td key={idx} className="py-2 px-3">
                    {idx === 0
                      ? renderForm(form, (v) => setForm(v))
                      : idx === columns.length - 1
                      ? (
                        <div className="flex justify-end gap-1">
                          <button className="btn-primary !py-1 !px-2 text-xs" onClick={submitCreate}>
                            <Save className="w-3 h-3" /> 保存
                          </button>
                          <button className="btn-ghost !py-1 !px-2" onClick={closeForm}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                      : null}
                  </td>
                ))}
                <td />
              </tr>
            )}
            {editingId && editForm && (
              <tr className="bg-ocean-50/40 border-b border-ocean-100">
                {columns.map((_, idx) => (
                  <td key={idx} className="py-2 px-3">
                    {idx === 0
                      ? renderForm(editForm, (v) => setEditForm(v))
                      : idx === columns.length - 1
                      ? (
                        <div className="flex justify-end gap-1">
                          <button className="btn-primary !py-1 !px-2 text-xs" onClick={submitEdit}>
                            <Save className="w-3 h-3" /> 保存
                          </button>
                          <button className="btn-ghost !py-1 !px-2" onClick={closeForm}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                      : null}
                  </td>
                ))}
                <td />
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-ocean-50 hover:bg-ocean-50/40 transition">
                {renderRow(item)}
                <td className="py-2 px-3 text-right">
                  <div className="inline-flex gap-1">
                    <button className="btn-ghost !p-1.5" onClick={() => startEdit(item)} title="编辑">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="btn-ghost !p-1.5 hover:text-coral-600"
                      onClick={() => {
                        if (confirm('确认删除？')) onDelete(item.id);
                      }}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !form && (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-sm text-ocean-500">
                  暂无数据，点击「新增」开始录入
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExhibitForm() {
  const exhibits = useAppStore((s) => s.exhibits);
  const addExhibit = useAppStore((s) => s.addExhibit);
  const updateExhibit = useAppStore((s) => s.updateExhibit);
  const deleteExhibit = useAppStore((s) => s.deleteExhibit);

  return (
    <CrudTable
      title="展区管理"
      columns={['展区信息', '操作']}
      items={exhibits}
      empty={{ name: '', description: '' }}
      onAdd={addExhibit}
      onUpdate={updateExhibit}
      onDelete={deleteExhibit}
      renderForm={(v, set) => (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input"
            placeholder="展区名称"
            value={(v as any).name}
            onChange={(e) => set({ ...v, name: e.target.value } as any)}
          />
          <input
            className="input"
            placeholder="描述（可选）"
            value={(v as any).description}
            onChange={(e) => set({ ...v, description: e.target.value } as any)}
          />
        </div>
      )}
      renderRow={(e: any) => (
        <>
          <td className="py-2.5 px-3">
            <div className="font-medium text-ocean-900">{e.name}</div>
            <div className="text-xs text-ocean-500">{e.description}</div>
          </td>
        </>
      )}
    />
  );
}

function SpeciesForm() {
  const species = useAppStore((s) => s.species);
  const exhibits = useAppStore((s) => s.exhibits);
  const addSpecies = useAppStore((s) => s.addSpecies);
  const updateSpecies = useAppStore((s) => s.updateSpecies);
  const deleteSpecies = useAppStore((s) => s.deleteSpecies);

  const exhibitMap = Object.fromEntries(exhibits.map((e) => [e.id, e.name]));

  return (
    <CrudTable
      title="物种管理"
      columns={['物种信息', '操作']}
      items={species}
      empty={{ name: '', emoji: '🐟', exhibitId: exhibits[0]?.id || '', defaultFeedAmountGrams: 100 }}
      onAdd={addSpecies}
      onUpdate={updateSpecies}
      onDelete={deleteSpecies}
      renderForm={(v, set) => {
        const s = v as any;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input className="input" placeholder="名称" value={s.name} onChange={(e) => set({ ...s, name: e.target.value })} />
            <input className="input" placeholder="emoji" value={s.emoji} onChange={(e) => set({ ...s, emoji: e.target.value })} />
            <select className="input" value={s.exhibitId} onChange={(e) => set({ ...s, exhibitId: e.target.value })}>
              {exhibits.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <input
              type="number"
              className="input"
              placeholder="默认投喂量(g)"
              value={s.defaultFeedAmountGrams}
              onChange={(e) => set({ ...s, defaultFeedAmountGrams: Number(e.target.value) })}
            />
          </div>
        );
      }}
      renderRow={(s: any) => (
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{s.emoji}</span>
            <div>
              <div className="font-medium text-ocean-900">{s.name}</div>
              <div className="text-xs text-ocean-500">
                {exhibitMap[s.exhibitId]} · 默认投喂 {s.defaultFeedAmountGrams}g
              </div>
            </div>
          </div>
        </td>
      )}
    />
  );
}

function FeedForm() {
  const feeds = useAppStore((s) => s.feeds);
  const feedStocks = useAppStore((s) => s.feedStocks);
  const addFeed = useAppStore((s) => s.addFeed);
  const updateFeed = useAppStore((s) => s.updateFeed);
  const deleteFeed = useAppStore((s) => s.deleteFeed);
  const updateFeedStock = useAppStore((s) => s.updateFeedStock);

  const stockMap = Object.fromEntries(feedStocks.map((s) => [s.feedId, s]));

  return (
    <CrudTable
      title="饲料与库存"
      columns={['饲料信息', '当前库存', '安全阈值', '操作']}
      items={feeds}
      empty={{ name: '', unit: 'g', safetyThreshold: 1000 }}
      onAdd={addFeed}
      onUpdate={updateFeed}
      onDelete={deleteFeed}
      renderForm={(v, set) => {
        const f = v as any;
        return (
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="饲料名称" value={f.name} onChange={(e) => set({ ...f, name: e.target.value })} />
            <input className="input" placeholder="单位(g/ml)" value={f.unit} onChange={(e) => set({ ...f, unit: e.target.value })} />
            <input
              type="number"
              className="input"
              placeholder="安全阈值"
              value={f.safetyThreshold}
              onChange={(e) => set({ ...f, safetyThreshold: Number(e.target.value) })}
            />
          </div>
        );
      }}
      renderRow={(f: any) => {
        const st = stockMap[f.id];
        const low = st && st.currentStock < f.safetyThreshold;
        return (
          <>
            <td className="py-2.5 px-3">
              <div className="font-medium text-ocean-900">{f.name}</div>
              <div className="text-xs text-ocean-500">单位：{f.unit}</div>
            </td>
            <td className="py-2.5 px-3">
              <input
                type="number"
                className="input !py-1 text-sm max-w-[120px]"
                value={st?.currentStock ?? 0}
                onChange={(e) => updateFeedStock(f.id, Number(e.target.value))}
              />
              {low && <div className="text-[11px] text-coral-600 mt-1">库存不足</div>}
            </td>
            <td className="py-2.5 px-3 text-sm text-ocean-700">{f.safetyThreshold} {f.unit}</td>
          </>
        );
      }}
    />
  );
}

function KeeperForm() {
  const keepers = useAppStore((s) => s.keepers);
  const addKeeper = useAppStore((s) => s.addKeeper);
  const updateKeeper = useAppStore((s) => s.updateKeeper);
  const deleteKeeper = useAppStore((s) => s.deleteKeeper);

  return (
    <CrudTable
      title="饲养员管理"
      columns={['饲养员信息', '操作']}
      items={keepers}
      empty={{ name: '', phone: '' }}
      onAdd={addKeeper}
      onUpdate={updateKeeper}
      onDelete={deleteKeeper}
      renderForm={(v, set) => {
        const k = v as any;
        return (
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="姓名" value={k.name} onChange={(e) => set({ ...k, name: e.target.value })} />
            <input className="input" placeholder="联系电话" value={k.phone} onChange={(e) => set({ ...k, phone: e.target.value })} />
          </div>
        );
      }}
      renderRow={(k: any) => (
        <td className="py-2.5 px-3">
          <div className="font-medium text-ocean-900">{k.name}</div>
          <div className="text-xs text-ocean-500">{k.phone}</div>
        </td>
      )}
    />
  );
}

function GuideForm() {
  const guides = useAppStore((s) => s.guides);
  const addGuide = useAppStore((s) => s.addGuide);
  const updateGuide = useAppStore((s) => s.updateGuide);
  const deleteGuide = useAppStore((s) => s.deleteGuide);

  return (
    <CrudTable
      title="讲解员管理"
      columns={['讲解员信息', '操作']}
      items={guides}
      empty={{ name: '', phone: '' }}
      onAdd={addGuide}
      onUpdate={updateGuide}
      onDelete={deleteGuide}
      renderForm={(v, set) => {
        const g = v as any;
        return (
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="姓名" value={g.name} onChange={(e) => set({ ...g, name: e.target.value })} />
            <input className="input" placeholder="联系电话" value={g.phone} onChange={(e) => set({ ...g, phone: e.target.value })} />
          </div>
        );
      }}
      renderRow={(g: any) => (
        <td className="py-2.5 px-3">
          <div className="font-medium text-ocean-900">{g.name}</div>
          <div className="text-xs text-ocean-500">{g.phone}</div>
        </td>
      )}
    />
  );
}

function WaterNoteForm() {
  const notes = useAppStore((s) => s.waterQualityNotes);
  const exhibits = useAppStore((s) => s.exhibits);
  const add = useAppStore((s) => s.addWaterQualityNote);
  const update = useAppStore((s) => s.updateWaterQualityNote);
  const del = useAppStore((s) => s.deleteWaterQualityNote);

  const exMap = Object.fromEntries(exhibits.map((e) => [e.id, e.name]));

  return (
    <CrudTable
      title="水质处理备注"
      columns={['处理时段信息', '操作']}
      items={notes}
      empty={{ exhibitId: exhibits[0]?.id || '', date: todayISO(), startTime: '12:00', endTime: '13:00', notes: '' }}
      onAdd={add}
      onUpdate={update}
      onDelete={del}
      renderForm={(v, set) => {
        const w = v as any;
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select className="input" value={w.exhibitId} onChange={(e) => set({ ...w, exhibitId: e.target.value })}>
              {exhibits.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <input type="date" className="input" value={w.date} onChange={(e) => set({ ...w, date: e.target.value })} />
            <input type="time" className="input" value={w.startTime} onChange={(e) => set({ ...w, startTime: e.target.value })} />
            <input type="time" className="input" value={w.endTime} onChange={(e) => set({ ...w, endTime: e.target.value })} />
            <input className="input" placeholder="备注（如：反冲洗）" value={w.notes} onChange={(e) => set({ ...w, notes: e.target.value })} />
          </div>
        );
      }}
      renderRow={(w: any) => (
        <td className="py-2.5 px-3">
          <div className="font-medium text-ocean-900">
            {exMap[w.exhibitId]} · {w.startTime}–{w.endTime}
          </div>
          <div className="text-xs text-ocean-500">{w.date} · {w.notes || '无备注'}</div>
        </td>
      )}
    />
  );
}
