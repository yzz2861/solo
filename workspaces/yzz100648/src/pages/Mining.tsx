import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pickaxe, ShieldAlert, Eye, XCircle, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { useRiskStore } from '@/store/riskStore';
import { useProjectStore } from '@/store/projectStore';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Progress from '@/components/ui/Progress';
import Empty from '@/components/ui/Empty';
import {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  DOWNWEIGHT_LABELS,
  type RiskCategory,
  type Risk,
} from '@/types';

const ALL_CATEGORIES: RiskCategory[] = ['safety', 'privacy', 'compliance', 'payment', 'vulnerable'];

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export default function Mining() {
  const { risks, responses, isMining, miningProgress, loadRisks, loadResponses, startMining, confirmRisk, rejectRisk, selectedCategory, setSelectedCategory } = useRiskStore();
  const { currentProject } = useProjectStore();

  const [enabledCategories, setEnabledCategories] = useState<Set<RiskCategory>>(new Set(ALL_CATEGORIES));
  const [detailRisk, setDetailRisk] = useState<Risk | null>(null);

  const projectId = currentProject?.id ?? '';

  useEffect(() => {
    if (projectId) {
      loadRisks(projectId);
      loadResponses(projectId);
    }
  }, [projectId, loadRisks, loadResponses]);

  const filteredRisks = useMemo(() => {
    if (selectedCategory === 'all') return risks;
    return risks.filter(r => r.riskCategory === selectedCategory);
  }, [risks, selectedCategory]);

  const stats = useMemo(() => ({
    totalResponses: responses.length,
    risksFound: risks.length,
    downweighted: risks.filter(r => r.isDownweighted).length,
  }), [responses, risks]);

  const toggleCategory = (cat: RiskCategory) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleStartMining = () => {
    if (!projectId || enabledCategories.size === 0) return;
    startMining(projectId, Array.from(enabledCategories));
  };

  return (
    <div className="min-h-screen bg-[#0F0F23] text-white">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <span>{currentProject?.name ?? 'Project'}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-[#F59E0B]">Risk Mining</span>
      </nav>

      <div className="mb-6 rounded-xl border border-white/5 bg-[#1A1A2E] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {ALL_CATEGORIES.map(cat => {
            const active = enabledCategories.has(cat);
            const color = RISK_CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: active ? color : 'transparent',
                  color: active ? '#fff' : color,
                  border: `1.5px solid ${color}`,
                  opacity: active ? 1 : 0.6,
                }}
              >
                {RISK_CATEGORY_LABELS[cat]}
              </button>
            );
          })}

          <Button
            variant="primary"
            size="sm"
            icon={<Pickaxe className="h-4 w-4" />}
            loading={isMining}
            disabled={enabledCategories.size === 0}
            onClick={handleStartMining}
            className="ml-auto"
          >
            Start Mining
          </Button>
        </div>

        {isMining && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
              <span>Mining in progress…</span>
              <span>{miningProgress}%</span>
            </div>
            <Progress value={miningProgress} />
          </motion.div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Total Responses', value: stats.totalResponses, color: '#6B7280' },
          { label: 'Risks Found', value: stats.risksFound, color: '#EF4444' },
          { label: 'Downweighted', value: stats.downweighted, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-[#1A1A2E] px-5 py-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="w-40 shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedCategory === 'all' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            All ({risks.length})
          </button>
          {ALL_CATEGORIES.map(cat => {
            const count = risks.filter(r => r.riskCategory === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedCategory === cat ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: RISK_CATEGORY_COLORS[cat] }} />
                {RISK_CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex-1">
          {filteredRisks.length === 0 ? (
            <Empty
              icon={<ShieldAlert className="h-10 w-10" />}
              title="No risks found"
              description="Start mining to discover potential risks in your responses."
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredRisks.map(risk => (
                  <motion.div
                    key={risk.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="relative flex overflow-hidden rounded-xl border border-white/5 bg-[#1A1A2E] p-4"
                  >
                    <div className="absolute left-0 top-0 h-full w-0.5" style={{ backgroundColor: RISK_CATEGORY_COLORS[risk.riskCategory] }} />

                    <div className="ml-3 flex-1 space-y-2">
                      <p className="text-sm text-gray-300">{truncate(risk.originalQuote, 80)}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge label={RISK_CATEGORY_LABELS[risk.riskCategory]} color={RISK_CATEGORY_COLORS[risk.riskCategory]} />
                        <Badge label={SEVERITY_LABELS[risk.severity]} color={SEVERITY_COLORS[risk.severity]} />
                        <span className="text-xs text-gray-500">{risk.impactScope}</span>
                        {risk.isDownweighted && (
                          <Badge label="Downweighted" color="#6B7280" variant="outline" className="text-[10px] px-1.5 py-0" />
                        )}
                        <button
                          onClick={() => setDetailRisk(risk)}
                          className="ml-auto text-xs text-[#F59E0B] hover:underline"
                        >
                          View Detail
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!detailRisk} onClose={() => setDetailRisk(null)} title="Risk Detail" size="lg">
        {detailRisk && (
          <div className="space-y-4">
            <blockquote className="border-l-4 border-[#F59E0B] bg-[#1A1A2E] py-3 pl-4 pr-3 text-sm text-gray-300 italic">
              {detailRisk.originalQuote}
            </blockquote>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="mb-1 text-xs text-gray-500">Category</p>
                <Badge label={RISK_CATEGORY_LABELS[detailRisk.riskCategory]} color={RISK_CATEGORY_COLORS[detailRisk.riskCategory]} />
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500">Severity</p>
                <Badge label={SEVERITY_LABELS[detailRisk.severity]} color={SEVERITY_COLORS[detailRisk.severity]} />
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500">Impact Scope</p>
                <span className="text-sm text-gray-300">{detailRisk.impactScope}</span>
              </div>
            </div>

            {detailRisk.isDownweighted && detailRisk.downweightReason && (
              <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3">
                <p className="mb-1 text-xs text-[#F59E0B]">Downweight Reason</p>
                <p className="text-sm text-gray-300">{DOWNWEIGHT_LABELS[detailRisk.downweightReason]}</p>
              </div>
            )}

            {detailRisk.responseId && (
              <div>
                <p className="mb-1 text-xs text-gray-500">Respondent</p>
                <span className="text-sm text-gray-300">{detailRisk.responseId}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" icon={<XCircle className="h-4 w-4" />} onClick={() => { rejectRisk(detailRisk.id); setDetailRisk(null); }}>
                Reject
              </Button>
              <Button variant="primary" size="sm" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { confirmRisk(detailRisk.id); setDetailRisk(null); }}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
