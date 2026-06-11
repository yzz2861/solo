import { create } from 'zustand';
import type { 
  CoverageReport, 
  StayReport, 
  MissedPointsReport,
  ComparisonReport 
} from '@/types';
import { 
  generateCoverageReport, 
  generateStayReport, 
  generateMissedPointsReport,
  compareShifts 
} from '@/services/analysisService';
import { exportToExcel, exportToPDF, exportToJSON } from '@/services/exportService';
import { useSceneStore } from './useSceneStore';

interface ReportState {
  coverageReport: CoverageReport | null;
  stayReport: StayReport | null;
  missedPointsReport: MissedPointsReport | null;
  comparisonReport: ComparisonReport | null;
  isGenerating: boolean;
  error: string | null;
  selectedComparisonShiftIds: string[];
  
  actions: {
    generateCoverageReport: () => void;
    generateStayReport: () => void;
    generateMissedPointsReport: () => void;
    generateAllReports: () => void;
    generateComparisonReport: () => void;
    setSelectedComparisonShiftIds: (ids: string[]) => void;
    toggleComparisonShift: (shiftId: string) => void;
    exportReport: (
      type: 'coverage' | 'stay' | 'missed' | 'comparison',
      format: 'excel' | 'pdf' | 'json',
      element?: HTMLElement
    ) => Promise<void>;
    clearReports: () => void;
  };
}

export const useReportStore = create<ReportState>((set, get) => ({
  coverageReport: null,
  stayReport: null,
  missedPointsReport: null,
  comparisonReport: null,
  isGenerating: false,
  error: null,
  selectedComparisonShiftIds: [],
  
  actions: {
    generateCoverageReport: () => {
      set({ isGenerating: true, error: null });
      
      try {
        const state = useSceneStore.getState();
        const selectedShift = state.actions.getSelectedShift();
        
        if (!selectedShift) {
          throw new Error('请先选择一个班次');
        }
        
        const report = generateCoverageReport(selectedShift, state.checkpoints);
        set({ coverageReport: report, isGenerating: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '生成报告失败',
          isGenerating: false,
        });
      }
    },
    
    generateStayReport: () => {
      set({ isGenerating: true, error: null });
      
      try {
        const selectedShift = useSceneStore.getState().actions.getSelectedShift();
        
        if (!selectedShift) {
          throw new Error('请先选择一个班次');
        }
        
        const report = generateStayReport(selectedShift);
        set({ stayReport: report, isGenerating: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '生成报告失败',
          isGenerating: false,
        });
      }
    },
    
    generateMissedPointsReport: () => {
      set({ isGenerating: true, error: null });
      
      try {
        const state = useSceneStore.getState();
        const selectedShift = state.actions.getSelectedShift();
        
        if (!selectedShift) {
          throw new Error('请先选择一个班次');
        }
        
        const report = generateMissedPointsReport(selectedShift, state.checkpoints);
        set({ missedPointsReport: report, isGenerating: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '生成报告失败',
          isGenerating: false,
        });
      }
    },
    
    generateAllReports: () => {
      get().actions.generateCoverageReport();
      get().actions.generateStayReport();
      get().actions.generateMissedPointsReport();
    },
    
    generateComparisonReport: () => {
      set({ isGenerating: true, error: null });
      
      try {
        const state = useSceneStore.getState();
        const { selectedComparisonShiftIds } = get();
        
        if (selectedComparisonShiftIds.length < 2) {
          throw new Error('请至少选择2个班次进行对比');
        }
        
        const shifts = state.patrolShifts.filter(s => 
          selectedComparisonShiftIds.includes(s.id)
        );
        
        const report = compareShifts(shifts, state.checkpoints);
        set({ comparisonReport: report, isGenerating: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '生成对比报告失败',
          isGenerating: false,
        });
      }
    },
    
    setSelectedComparisonShiftIds: (ids) => {
      set({ selectedComparisonShiftIds: ids });
    },
    
    toggleComparisonShift: (shiftId) => {
      set((state) => {
        const isSelected = state.selectedComparisonShiftIds.includes(shiftId);
        return {
          selectedComparisonShiftIds: isSelected
            ? state.selectedComparisonShiftIds.filter(id => id !== shiftId)
            : [...state.selectedComparisonShiftIds, shiftId],
        };
      });
    },
    
    exportReport: async (type, format, element) => {
      const state = get();
      
      let report: any = null;
      switch (type) {
        case 'coverage':
          report = state.coverageReport;
          break;
        case 'stay':
          report = state.stayReport;
          break;
        case 'missed':
          report = state.missedPointsReport;
          break;
        case 'comparison':
          report = state.comparisonReport;
          break;
      }
      
      if (!report) {
        throw new Error('请先生成对应的报告');
      }
      
      const filename = `${type}-report-${Date.now()}`;
      
      switch (format) {
        case 'excel':
          exportToExcel(report, type);
          break;
        case 'json':
          exportToJSON(report, `${filename}.json`);
          break;
        case 'pdf':
          if (element) {
            await exportToPDF(element, `${filename}.pdf`);
          } else {
            throw new Error('导出PDF需要提供DOM元素');
          }
          break;
      }
    },
    
    clearReports: () => {
      set({
        coverageReport: null,
        stayReport: null,
        missedPointsReport: null,
        comparisonReport: null,
        error: null,
      });
    },
  },
}));
