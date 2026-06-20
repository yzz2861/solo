import React, { useEffect, useState } from 'react';
import {
  Search, Plus, CheckCircle, Clock, Edit2, Trash2, Eye, Filter,
  Lightbulb, Tag, MapPin, Calendar, Leaf,
} from 'lucide-react';
import SourceBadge from '@/components/SourceBadge';
import { useExperienceStore } from '@/stores/useExperienceStore';
import { CROP_LIBRARY, REGION_LIBRARY } from '@/data/mockData';
import { cn } from '@/lib/utils';
import type { MaterialItem, SourceType } from '@/types';

interface FormData {
  title: string;
  content: string;
  applicableCrops: string[];
  applicableVarieties?: string[];
  applicableRegions: string[];
  applicableSeasons: number[];
  keywords: string[];
  createdBy: string;
}

const ALL_REGIONS = REGION_LIBRARY.flatMap((r) =>
  r.counties.map((c) => `${r.province}${r.city}${c}`)
);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DFLT: FormData = {
  title: '', content: '', applicableCrops: [], applicableVarieties: [],
  applicableRegions: [], applicableSeasons: [], keywords: [], createdBy: '',
};

export default function ExperiencePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(DFLT);
  const [search, setSearch] = useState('');

  const {
    experiences, isLoading, statusFilter, list, create, approve,
    update, remove, setStatusFilter,
  } = useExperienceStore();

  useEffect(() => { void list(); }, [list]);

  const filtered = experiences.filter((item) => {
    if (!search.trim()) return true;
    const kw = search.trim().toLowerCase();
    return item.title.toLowerCase().includes(kw)
      || item.keywords.some((k) => k.toLowerCase().includes(kw));
  });

  const now = Date.now();
  const monthMs = 30 * 24 * 3600 * 1000;
  const stats = {
    total: experiences.length,
    approved: experiences.filter((e) => e.status === 'approved').length,
    pending: experiences.filter((e) => e.status === 'pending').length,
    month: experiences.filter((e) => now - new Date(e.createdAt).getTime() <= monthMs).length,
  };

  const resetForm = () => { setFormData(DFLT); setEditingId(null); };
  const toggleArr = (k: keyof FormData, v: string | number) => {
    setFormData((p) => ({ ...p, [k]: (p[k] as (string | number)[]).includes(v)
      ? (p[k] as (string | number)[]).filter((x) => x !== v)
      : [...(p[k] as (string | number)[]), v] } as FormData));
  };

  const handleEdit = (item: MaterialItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title, content: item.content,
      applicableCrops: [...item.applicableCrops],
      applicableVarieties: item.applicableVarieties ? [...item.applicableVarieties] : [],
      applicableRegions: [...item.applicableRegions],
      applicableSeasons: item.applicableSeasons
        .map((s) => parseInt(s.replace('月', ''), 10)).filter((n) => !isNaN(n)),
      keywords: [...item.keywords],
      createdBy: item.createdBy || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    const payload: Omit<MaterialItem, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title.trim(), content: formData.content.trim(),
      sourceType: 'experience' as SourceType,
      sourceName: formData.createdBy || '农技员经验',
      applicableCrops: formData.applicableCrops,
      applicableVarieties: formData.applicableVarieties,
      applicableRegions: formData.applicableRegions,
      applicableSeasons: formData.applicableSeasons.map((m) => `${m}月`),
      keywords: formData.keywords.filter(Boolean),
      createdBy: formData.createdBy, status: 'pending' as const,
    };
    if (editingId) await update(editingId, payload);
    else await create(payload);
    setShowForm(false); resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条经验吗？')) await remove(id);
  };

  const statusBtns = [
    { k: 'all', l: '全部', I: Filter },
    { k: 'pending', l: '待审核', I: Clock },
    { k: 'approved', l: '已通过', I: CheckCircle },
  ];
  const kpis = [
    { v: stats.total, l: '经验总数', I: Lightbulb, bg: 'leaf' },
    { v: stats.approved, l: '已审核', I: CheckCircle, bg: 'green' },
    { v: stats.pending, l: '待审核', I: Clock, bg: 'harvest' },
    { v: stats.month, l: '本月新增', I: Calendar, bg: 'sky' },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-leaf-800">本地经验库</h1>
          <p className="text-sm text-leaf-500 mt-1">记录农技员一线经验，审核后自动并入检索资料库</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
          <Plus className="w-4 h-4" /><span>录入新经验</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {kpis.map(({ v, l, I: Ic, bg }) => (
          <div key={l} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                bg === 'leaf' && 'bg-leaf-100', bg === 'green' && 'bg-green-100',
                bg === 'harvest' && 'bg-harvest-100', bg === 'sky' && 'bg-sky-100')}>
                <Ic className={cn('w-5 h-5',
                  bg === 'leaf' && 'text-leaf-600', bg === 'green' && 'text-green-600',
                  bg === 'harvest' && 'text-harvest-600', bg === 'sky' && 'text-sky-600')} />
              </div>
              <div>
                <p className="text-2xl font-bold text-leaf-800">{v}</p>
                <p className="text-xs text-leaf-500">{l}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-3 mb-5 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {statusBtns.map(({ k, l, I: Ic }) => (
            <button key={k} type="button"
              className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                statusFilter === k ? 'bg-leaf-600 text-white' : 'border bg-white text-leaf-700 hover:bg-leaf-50 border-leaf-200')}
              onClick={() => { setStatusFilter(k as 'all' | 'pending' | 'approved');
                void list(k === 'all' ? undefined : (k as 'pending' | 'approved')); }}>
              <Ic className="w-4 h-4" /><span>{l}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Search className="w-5 h-5 text-leaf-400" />
          <input type="text" className="w-56 input" placeholder="搜索经验标题关键词"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <div className="card p-5 mb-5 animate-fade-in-up">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-4">{editingId ? '编辑经验' : '录入新经验'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-leaf-700 mb-1 block">经验标题</label>
              <input type="text" className="mb-4 input" placeholder="例如：余杭山区水稻高温干旱应对经验"
                value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              <label className="text-sm font-medium text-leaf-700 mb-1 block">经验内容（详细描述）</label>
              <textarea rows={6} className="mb-4 textarea" placeholder="描述具体场景、措施、效果..."
                value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
              <label className="text-sm font-medium text-leaf-700 mb-1 block">关键词（逗号分隔）</label>
              <input type="text" className="input" placeholder="高温, 干旱, 灌水, 遮阳网"
                value={formData.keywords.join(',')}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value.split(/[,，]/).map((k) => k.trim()) })} />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-leaf-700 mb-1.5 flex items-center gap-1"><Leaf className="w-4 h-4" />适用作物（多选）</label>
                <div className="flex flex-wrap gap-1.5">
                  {CROP_LIBRARY.map((c) => (
                    <button key={c.name} type="button"
                      className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        formData.applicableCrops.includes(c.name) ? 'bg-leaf-600 text-white' : 'bg-white border border-leaf-200 text-leaf-700 hover:bg-leaf-50')}
                      onClick={() => { setFormData((p) => ({ ...p, applicableCrops: p.applicableCrops.includes(c.name)
                        ? p.applicableCrops.filter((x) => x !== c.name)
                        : [...p.applicableCrops, c.name], applicableVarieties: [] })); }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-leaf-700 mb-1.5 flex items-center gap-1"><MapPin className="w-4 h-4" />适用地区（多选）</label>
                <select multiple className="w-full rounded-lg border border-leaf-200 p-2 text-sm min-h-20"
                  value={formData.applicableRegions}
                  onChange={(e) => setFormData({ ...formData, applicableRegions: Array.from(e.target.selectedOptions, (o) => o.value) })}>
                  {ALL_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-leaf-700 mb-1.5 flex items-center gap-1"><Calendar className="w-4 h-4" />适用月份（多选）</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map((m) => (
                    <button key={m} type="button" onClick={() => toggleArr('applicableSeasons', m)}
                      className={cn('py-1.5 rounded-lg text-sm font-medium transition-all',
                        formData.applicableSeasons.includes(m) ? 'bg-leaf-600 text-white' : 'bg-white border border-leaf-200 text-leaf-700 hover:bg-leaf-50')}>
                      {m}月
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-leaf-700 mb-1 block">录入人</label>
                <input type="text" className="input" placeholder="农技员姓名"
                  value={formData.createdBy} onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>取消</button>
            <button type="button" className="btn-primary" onClick={() => void handleSubmit()}>{editingId ? '保存修改' : '提交审核'}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="h-6 w-40 bg-leaf-100 rounded-full mb-3" />
              <div className="h-5 bg-leaf-100 rounded w-3/4 mb-2" />
              <div className="space-y-1.5 mb-3">
                <div className="h-3 bg-leaf-100 rounded w-full" />
                <div className="h-3 bg-leaf-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Lightbulb className="w-16 h-16 text-leaf-200 mx-auto mb-3" />
          <p className="text-leaf-500">还没有经验，点击右上角录入第一条农技经验</p>
        </div>
      ) : (
        <div className="space-y-4 animate-stagger">
          {filtered.map((item) => (
            <div key={item.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SourceBadge sourceType="experience" sourceName={item.createdBy || '农技员经验'} />
                  {item.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600"><Clock className="w-3 h-3" />待审核</span>}
                  {item.status === 'approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600"><CheckCircle className="w-3 h-3" />已通过</span>}
                </div>
                <div className="flex gap-1">
                  <button type="button" className="p-1.5 rounded hover:bg-leaf-50 text-leaf-500" title="查看"><Eye className="w-4 h-4" /></button>
                  {item.status === 'pending' && <button type="button" className="p-1.5 rounded hover:bg-green-50 text-green-600" title="审核通过" onClick={() => void approve(item.id)}><CheckCircle className="w-4 h-4" /></button>}
                  <button type="button" className="p-1.5 rounded hover:bg-leaf-50 text-leaf-500" title="编辑" onClick={() => handleEdit(item)}><Edit2 className="w-4 h-4" /></button>
                  <button type="button" className="p-1.5 rounded hover:bg-red-50 text-red-500" title="删除" onClick={() => void handleDelete(item.id)}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h4 className="font-medium text-leaf-900 text-lg mb-2">{item.title}</h4>
              <p className="text-sm text-leaf-700 leading-relaxed whitespace-pre-wrap mb-3">{item.content}</p>
              <div className="border-t pt-3 flex flex-wrap gap-4 text-xs text-leaf-500">
                <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5" />{item.applicableCrops.join('、')}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.applicableRegions.join('、')}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{item.applicableSeasons.join('、')}</span>
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{item.keywords.join('、')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
