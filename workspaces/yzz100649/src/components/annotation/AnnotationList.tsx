import { useMemo, useState } from 'react';
import type { Annotation, RiskCategory, ExpressionType, EditorStatus, DoctorDecision, RiskLevel } from '@/types';
import {
  CATEGORY_META,
  EXPRESSION_META,
  RISK_LEVEL_META,
  EDITOR_STATUS_META,
  DOCTOR_DECISION_META,
} from '@/types';
import { Tag } from '@/components/common/Tag';
import { clsx } from 'clsx';
import { BookOpen, User, Megaphone, Cloud, ChevronDown, ChevronRight, Filter } from 'lucide-react';

interface Props {
  annotations: Annotation[];
  activeId?: string | null;
  onSelect: (id: string | null) => void;
  groupBy?: 'category' | 'riskLevel' | 'none';
  showDoctor?: boolean;
}

const EXPRESSION_ICONS = {
  guideline: <BookOpen className="w-3 h-3" />,
  patient_story: <User className="w-3 h-3" />,
  advertising: <Megaphone className="w-3 h-3" />,
  vague_suggestion: <Cloud className="w-3 h-3" />,
};

export function AnnotationList({ annotations, activeId, onSelect, groupBy = 'category', showDoctor = false }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | EditorStatus>('all');
  const [catFilter, setCatFilter] = useState<'all' | RiskCategory>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return annotations.filter((a) => {
      if (statusFilter !== 'all' && a.editorStatus !== statusFilter) return false;
      if (catFilter !== 'all' && a.category !== catFilter) return false;
      return true;
    });
  }, [annotations, statusFilter, catFilter]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '全部', items: filtered }];
    const keyOf = (a: Annotation): string =>
      groupBy === 'category' ? a.category : a.riskLevel;
    const labelOf = (k: string): string => {
      if (groupBy === 'category') return CATEGORY_META[k as RiskCategory].label;
      return RISK_LEVEL_META[k as RiskLevel].label;
    };
    const map = new Map<string, Annotation[]>();
    for (const a of filtered) {
      const k = keyOf(a);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, items]) => ({ key: k, label: labelOf(k), items }));
  }, [filtered, groupBy]);

  const summary = useMemo(() => {
    return {
      total: annotations.length,
      high: annotations.filter((a) => a.riskLevel === 'high').length,
      medium: annotations.filter((a) => a.riskLevel === 'medium').length,
      low: annotations.filter((a) => a.riskLevel === 'low').length,
    };
  }, [annotations]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-3 bg-slate-50/50">
        <div className="flex items-center gap-3 flex-wrap">
          <Stat label="总计" value={summary.total} tone="slate" />
          <Stat label="高风险" value={summary.high} tone="red" />
          <Stat label="中风险" value={summary.medium} tone="amber" />
          <Stat label="低风险" value={summary.low} tone="green" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as typeof catFilter)}
            className="h-7 text-xs px-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30"
          >
            <option value="all">全部类别</option>
            {Object.entries(CATEGORY_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-7 text-xs px-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30"
          >
            <option value="all">全部编辑状态</option>
            {Object.entries(EDITOR_STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-400">
            暂无匹配的标注项
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} className="border-b border-slate-100 last:border-0">
            <button
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [g.key]: !prev[g.key] }))
              }
              className="w-full px-4 h-10 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2">
                {collapsed[g.key] ? (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {g.label}
                </span>
                <span className="px-1.5 py-px rounded-full bg-slate-100 text-slate-500 text-[11px]">
                  {g.items.length}
                </span>
              </div>
            </button>
            {!collapsed[g.key] && (
              <div className="pb-2">
                {g.items.map((a) => (
                  <AnnotationRow
                    key={a.id}
                    annotation={a}
                    isActive={activeId === a.id}
                    onClick={() => onSelect(a.id)}
                    showDoctor={showDoctor}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'red' | 'amber' | 'green' }) {
  const toneCls = {
    slate: 'bg-slate-100 text-slate-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  }[tone];
  return (
    <div className={clsx('flex items-baseline gap-1.5 px-2.5 py-1 rounded-lg', toneCls)}>
      <span className="text-lg font-semibold leading-none">{value}</span>
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

function AnnotationRow({
  annotation,
  isActive,
  onClick,
  showDoctor,
}: {
  annotation: Annotation;
  isActive: boolean;
  onClick: () => void;
  showDoctor: boolean;
}) {
  const cat = CATEGORY_META[annotation.category];
  const exp = EXPRESSION_META[annotation.expressionType as ExpressionType];
  const rl = RISK_LEVEL_META[annotation.riskLevel as RiskLevel];
  const es = EDITOR_STATUS_META[annotation.editorStatus as EditorStatus];
  return (
    <button
      onClick={onClick}
      className={clsx(
        'block w-full text-left mx-3 mb-2 p-3 rounded-lg border transition',
        isActive
          ? 'bg-[#1e3a5f]/5 border-[#1e3a5f]/30 ring-1 ring-[#1e3a5f]/20'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: cat.color }}
        />
        <span className={clsx('text-xs font-medium', cat.text)}>{cat.label}</span>
        <Tag className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-500">
          {EXPRESSION_ICONS[annotation.expressionType as ExpressionType]}
          {exp.label}
        </Tag>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
          <span className={clsx('w-1.5 h-1.5 rounded-full', rl.dot)} />
          {rl.label}
        </span>
      </div>
      <p className="text-[13px] text-slate-700 line-clamp-2 leading-relaxed mb-2">
        {annotation.originalText}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-400">
          第{annotation.paragraphIndex + 1}段
          {annotation.lineNumber ? ` · L${annotation.lineNumber}` : ''}
        </span>
        <Tag className={clsx('text-[10px] px-1.5 py-0', es.cls)}>{es.label}</Tag>
        {showDoctor && annotation.doctorDecision !== 'pending' && (
          <Tag className={clsx('text-[10px] px-1.5 py-0', DOCTOR_DECISION_META[annotation.doctorDecision as DoctorDecision].cls)}>
            医生: {DOCTOR_DECISION_META[annotation.doctorDecision as DoctorDecision].label}
          </Tag>
        )}
      </div>
    </button>
  );
}
