import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRiskStore } from '@/store/riskStore';
import { useProjectStore } from '@/store/projectStore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Empty from '@/components/ui/Empty';
import {
  RiskCategory,
  RiskStatus,
  Severity,
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  DOWNWEIGHT_LABELS,
} from '@/types';

const CSV_HEADERS = ['原话', '风险类别', '严重程度', '影响范围', '评审状态', '处理建议', '负责人', '降权原因'];

export default function Export() {
  const { id: projectId } = useParams<{ id: string }>();
  const { risks, loadRisks } = useRiskStore();
  const { currentProject, loadProjects, setCurrentProject } = useProjectStore();

  const [selectedCategories, setSelectedCategories] = useState<Set<RiskCategory>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<RiskStatus>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (projectId) {
      loadRisks(projectId);
      loadProjects().then(() => {
        const { projects } = useProjectStore.getState();
        const proj = projects.find((p) => p.id === projectId);
        if (proj) setCurrentProject(proj);
      });
    }
  }, [projectId]);

  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(r.riskCategory)) return false;
      if (selectedSeverities.size > 0 && !selectedSeverities.has(r.severity)) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(r.status)) return false;
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        if (r.createdAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 86400000;
        if (r.createdAt >= to) return false;
      }
      return true;
    });
  }, [risks, selectedCategories, selectedSeverities, selectedStatuses, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredRisks.length / PAGE_SIZE));
  const paginatedRisks = filteredRisks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRisks.forEach((r) => {
      counts[r.riskCategory] = (counts[r.riskCategory] || 0) + 1;
    });
    return counts;
  }, [filteredRisks]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRisks.forEach((r) => {
      counts[r.severity] = (counts[r.severity] || 0) + 1;
    });
    return counts;
  }, [filteredRisks]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRisks.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [filteredRisks]);

  const toggleCategory = (cat: RiskCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    setPage(1);
  };

  const toggleSeverity = (sev: Severity) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
    setPage(1);
  };

  const toggleStatus = (status: RiskStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
    setPage(1);
  };

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const buildCSVRows = () => {
    return filteredRisks.map((r) => [
      escapeCSV(r.originalQuote),
      escapeCSV(RISK_CATEGORY_LABELS[r.riskCategory]),
      escapeCSV(SEVERITY_LABELS[r.severity]),
      escapeCSV(r.impactScope),
      escapeCSV(STATUS_LABELS[r.status]),
      escapeCSV(r.handlingSuggestion || ''),
      escapeCSV(r.assignee || ''),
      escapeCSV(r.isDownweighted && r.downweightReason ? DOWNWEIGHT_LABELS[r.downweightReason] : ''),
    ]);
  };

  const exportCSV = () => {
    const rows = buildCSVRows();
    const csv = [CSV_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'export'}_risks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Risk Export Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Project: ${currentProject?.name || 'N/A'}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 34);
    doc.text(`Total Risks: ${filteredRisks.length}`, 14, 40);

    const tableData = filteredRisks.map((r) => [
      r.originalQuote.slice(0, 40),
      RISK_CATEGORY_LABELS[r.riskCategory],
      SEVERITY_LABELS[r.severity],
      r.impactScope,
      STATUS_LABELS[r.status],
      r.handlingSuggestion || '',
      r.assignee || '',
      r.isDownweighted && r.downweightReason ? DOWNWEIGHT_LABELS[r.downweightReason] : '',
    ]);

    autoTable(doc, {
      head: [CSV_HEADERS],
      body: tableData,
      startY: 46,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95], textColor: 226, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 40 } },
      margin: { left: 14, right: 14 },
    });

    doc.save(`${currentProject?.name || 'export'}_risks.pdf`);
  };

  const allCategories: RiskCategory[] = ['safety', 'privacy', 'compliance', 'payment', 'vulnerable'];
  const allSeverities: Severity[] = ['critical', 'high', 'medium', 'low'];
  const allStatuses: RiskStatus[] = ['pending', 'confirmed', 'rejected', 'in_progress', 'closed'];

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-[#F59E0B]">{currentProject?.name || 'Project'}</span>
        <span>/</span>
        <span>Export Summary</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#1E3A5F]/50 bg-[#16213E] p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-[#F59E0B]">Filters</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-2 text-xs text-gray-400">Category</p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <label key={cat} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="h-3.5 w-3.5 rounded border-[#1E3A5F] bg-[#1A1A2E] text-[#F59E0B] focus:ring-[#F59E0B]/30"
                  />
                  <Badge
                    label={RISK_CATEGORY_LABELS[cat]}
                    color={RISK_CATEGORY_COLORS[cat]}
                    variant={selectedCategories.has(cat) ? 'solid' : 'outline'}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-gray-400">Severity</p>
            <div className="flex flex-wrap gap-2">
              {allSeverities.map((sev) => (
                <label key={sev} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSeverities.has(sev)}
                    onChange={() => toggleSeverity(sev)}
                    className="h-3.5 w-3.5 rounded border-[#1E3A5F] bg-[#1A1A2E] text-[#F59E0B] focus:ring-[#F59E0B]/30"
                  />
                  <Badge
                    label={SEVERITY_LABELS[sev]}
                    color={SEVERITY_COLORS[sev]}
                    variant={selectedSeverities.has(sev) ? 'solid' : 'outline'}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-gray-400">Status</p>
            <div className="flex flex-wrap gap-2">
              {allStatuses.map((status) => (
                <label key={status} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(status)}
                    onChange={() => toggleStatus(status)}
                    className="h-3.5 w-3.5 rounded border-[#1E3A5F] bg-[#1A1A2E] text-[#F59E0B] focus:ring-[#F59E0B]/30"
                  />
                  <Badge
                    label={STATUS_LABELS[status]}
                    color={STATUS_COLORS[status]}
                    variant={selectedStatuses.has(status) ? 'solid' : 'outline'}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-gray-400">Date Range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="rounded-lg border border-[#1E3A5F] bg-[#1A1A2E] px-3 py-1.5 text-xs text-white focus:border-[#F59E0B]/50 focus:outline-none"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="rounded-lg border border-[#1E3A5F] bg-[#1A1A2E] px-3 py-1.5 text-xs text-white focus:border-[#F59E0B]/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {filteredRisks.length === 0 ? (
        <Empty
          icon={<FileText className="h-10 w-10" />}
          title="No risks to export"
          description="Adjust filters or mine risks first"
        />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-[#1E3A5F]/50 bg-[#16213E] p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-[#1E3A5F]/30 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{currentProject?.name || 'Project'}</h2>
                <p className="text-xs text-gray-400">
                  Export Date: {new Date().toLocaleDateString()} | Total Risks: {filteredRisks.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-[#F59E0B]/40" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[#1E3A5F]/30 bg-[#1A1A2E] p-4">
                <p className="mb-2 text-xs font-semibold text-[#F59E0B]">By Category</p>
                <div className="space-y-1">
                  {allCategories.map((cat) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span style={{ color: RISK_CATEGORY_COLORS[cat] }}>{RISK_CATEGORY_LABELS[cat]}</span>
                      <span className="text-gray-400">{categoryCounts[cat] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#1E3A5F]/30 bg-[#1A1A2E] p-4">
                <p className="mb-2 text-xs font-semibold text-[#F59E0B]">By Severity</p>
                <div className="space-y-1">
                  {allSeverities.map((sev) => (
                    <div key={sev} className="flex items-center justify-between text-xs">
                      <span style={{ color: SEVERITY_COLORS[sev] }}>{SEVERITY_LABELS[sev]}</span>
                      <span className="text-gray-400">{severityCounts[sev] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#1E3A5F]/30 bg-[#1A1A2E] p-4">
                <p className="mb-2 text-xs font-semibold text-[#F59E0B]">By Status</p>
                <div className="space-y-1">
                  {allStatuses.map((status) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span style={{ color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                      <span className="text-gray-400">{statusCounts[status] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk List</h4>
              {paginatedRisks.map((risk, idx) => (
                <motion.div
                  key={risk.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-lg border border-[#1E3A5F]/30 bg-[#1A1A2E] p-4 space-y-2"
                >
                  <p className="text-sm text-white leading-relaxed">"{risk.originalQuote}"</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={RISK_CATEGORY_LABELS[risk.riskCategory]} color={RISK_CATEGORY_COLORS[risk.riskCategory]} />
                    <Badge label={SEVERITY_LABELS[risk.severity]} color={SEVERITY_COLORS[risk.severity]} />
                    <Badge label={STATUS_LABELS[risk.status]} color={STATUS_COLORS[risk.status]} />
                    <span className="text-xs text-gray-500">{risk.impactScope}</span>
                  </div>
                  {(risk.handlingSuggestion || risk.assignee) && (
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      {risk.handlingSuggestion && (
                        <span>Suggestion: <span className="text-gray-300">{risk.handlingSuggestion}</span></span>
                      )}
                      {risk.assignee && (
                        <span>Assignee: <span className="text-gray-300">{risk.assignee}</span></span>
                      )}
                    </div>
                  )}
                  {risk.isDownweighted && risk.downweightReason && (
                    <p className="text-xs text-gray-600">Downweighted: {DOWNWEIGHT_LABELS[risk.downweightReason]}</p>
                  )}
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[#1E3A5F]/50 bg-[#1A1A2E] p-2 text-gray-400 transition-colors hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[#1E3A5F]/50 bg-[#1A1A2E] p-2 text-gray-400 transition-colors hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCSV}>
              Export CSV
            </Button>
            <Button variant="primary" icon={<FileText className="h-4 w-4" />} onClick={exportPDF}>
              Export PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
