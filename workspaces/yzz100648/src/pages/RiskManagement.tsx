import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { useRiskStore } from '@/store/riskStore';
import { useProjectStore } from '@/store/projectStore';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type RiskCategory,
  type RiskStatus,
  type Risk,
} from '@/types';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(RISK_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export default function RiskManagement() {
  const {
    risks,
    selectedCategory,
    selectedStatus,
    loadRisks,
    confirmRisk,
    rejectRisk,
    updateRiskStatus,
    updateRiskSuggestion,
    updateRiskAssignee,
    setSelectedCategory,
    setSelectedStatus,
  } = useRiskStore();

  const { currentProject, teamMembers, loadTeamMembers } = useProjectStore();

  const projectId = currentProject?.id ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [suggestionDraft, setSuggestionDraft] = useState('');

  useEffect(() => {
    if (projectId) {
      loadRisks(projectId);
      loadTeamMembers(projectId);
    }
  }, [projectId, loadRisks, loadTeamMembers]);

  const filteredRisks = useMemo(() => {
    return risks.filter(r => {
      if (selectedCategory !== 'all' && r.riskCategory !== selectedCategory) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (searchQuery && !r.originalQuote.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [risks, selectedCategory, selectedStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<RiskStatus, number> = { pending: 0, confirmed: 0, in_progress: 0, closed: 0, rejected: 0 };
    risks.forEach(r => { counts[r.status]++; });
    return counts;
  }, [risks]);

  const memberOptions = useMemo(() => {
    return teamMembers.map(m => ({ value: m.id, label: m.name }));
  }, [teamMembers]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === filteredRisks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRisks.map(r => r.id)));
    }
  }, [selectedIds.size, filteredRisks]);

  const handleBulkConfirm = async () => {
    for (const id of selectedIds) await confirmRisk(id);
    setSelectedIds(new Set());
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) await rejectRisk(id);
    setSelectedIds(new Set());
  };

  const startEditSuggestion = (risk: Risk) => {
    setEditingSuggestionId(risk.id);
    setSuggestionDraft(risk.handlingSuggestion ?? '');
  };

  const saveSuggestion = async (id: string) => {
    await updateRiskSuggestion(id, suggestionDraft);
    setEditingSuggestionId(null);
    setSuggestionDraft('');
  };

  return (
    <div className="min-h-screen bg-[#0F0F23] text-white">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <span>{currentProject?.name ?? 'Project'}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-[#F59E0B]">Risk Management</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-[#1A1A2E] p-4">
        <Select
          value={selectedCategory}
          onChange={(v) => setSelectedCategory(v as RiskCategory | 'all')}
          options={CATEGORY_OPTIONS}
          className="w-44"
        />
        <Select
          value={selectedStatus}
          onChange={(v) => setSelectedStatus(v as RiskStatus | 'all')}
          options={STATUS_OPTIONS}
          className="w-44"
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search quote text…"
            className="w-full rounded-lg border border-white/10 bg-[#1A1A2E] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-[#F59E0B]/50 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
          />
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        {(Object.entries(statusCounts) as [RiskStatus, number][]).map(([status, count]) => (
          <div key={status} className="flex-1 rounded-xl border border-white/5 bg-[#1A1A2E] px-4 py-3">
            <p className="text-xs text-gray-500">{STATUS_LABELS[status]}</p>
            <p className="mt-0.5 text-xl font-bold" style={{ color: STATUS_COLORS[status] }}>{count}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-3"
          >
            <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-sm text-[#F59E0B]">{selectedIds.size} selected</span>
            <div className="ml-auto flex gap-2">
              <Button variant="primary" size="sm" icon={<CheckCircle2 className="h-4 w-4" />} onClick={handleBulkConfirm}>
                Confirm All
              </Button>
              <Button variant="danger" size="sm" icon={<XCircle className="h-4 w-4" />} onClick={handleBulkReject}>
                Reject All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1A1A2E]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-gray-500">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredRisks.length && filteredRisks.length > 0}
                  onChange={toggleAll}
                  className="rounded border-white/20 bg-[#0F0F23] text-[#F59E0B] focus:ring-[#F59E0B]/30"
                />
              </th>
              <th className="px-4 py-3 text-left">Quote</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Severity</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Assignee</th>
              <th className="px-4 py-3 text-left">Suggestion</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRisks.map(risk => (
              <tr key={risk.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(risk.id)}
                    onChange={() => toggleSelect(risk.id)}
                    className="rounded border-white/20 bg-[#0F0F23] text-[#F59E0B] focus:ring-[#F59E0B]/30"
                  />
                </td>
                <td className="max-w-xs px-4 py-3">
                  {expandedId === risk.id ? (
                    <div>
                      <p className="text-sm text-gray-300">{risk.originalQuote}</p>
                      <button onClick={() => setExpandedId(null)} className="mt-1 text-xs text-[#F59E0B] hover:underline">Collapse</button>
                    </div>
                  ) : (
                    <button onClick={() => setExpandedId(risk.id)} className="text-left text-sm text-gray-300 hover:text-white">
                      {truncate(risk.originalQuote, 50)}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge label={RISK_CATEGORY_LABELS[risk.riskCategory]} color={RISK_CATEGORY_COLORS[risk.riskCategory]} />
                </td>
                <td className="px-4 py-3">
                  <Badge label={SEVERITY_LABELS[risk.severity]} color={SEVERITY_COLORS[risk.severity]} />
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={risk.status}
                    onChange={(v) => updateRiskStatus(risk.id, v as RiskStatus)}
                    options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                    className="w-28"
                  />
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={risk.assignee ?? ''}
                    onChange={(v) => updateRiskAssignee(risk.id, v)}
                    options={[{ value: '', label: 'Unassigned' }, ...memberOptions]}
                    className="w-28"
                  />
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  {editingSuggestionId === risk.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={suggestionDraft}
                        onChange={e => setSuggestionDraft(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-white/10 bg-[#0F0F23] px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:border-[#F59E0B]/50 focus:outline-none focus:ring-1 focus:ring-[#F59E0B]/20"
                      />
                      <Button variant="primary" size="sm" onClick={() => saveSuggestion(risk.id)}>Save</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditSuggestion(risk)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#F59E0B]"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {risk.handlingSuggestion ? truncate(risk.handlingSuggestion, 20) : 'Add suggestion'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {risk.status === 'pending' && (
                      <>
                        <button onClick={() => confirmRisk(risk.id)} className="rounded p-1 text-green-400 hover:bg-green-400/10" title="Confirm">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => rejectRisk(risk.id)} className="rounded p-1 text-gray-400 hover:bg-gray-400/10" title="Reject">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRisks.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-500">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No risks match your filters</p>
            <p className="text-xs text-gray-600">Try adjusting the category, status, or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
