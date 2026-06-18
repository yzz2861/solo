import { create } from 'zustand';
import type { ApprovalRecord, PowerCheckpoint, ExhibitionObject, RiskItem, MallConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { sampleApprovalRecords, createPowerCheckpoints } from '../utils/mockData';
import jsPDF from 'jspdf';

interface ApprovalState {
  approvalRecords: ApprovalRecord[];
  powerCheckpoints: PowerCheckpoint[];
  addApprovalRecord: (plan: Partial<ApprovalRecord>) => void;
  updateApprovalRecord: (id: string, updates: Partial<ApprovalRecord>) => void;
  updatePowerCheckpoint: (id: string, updates: Partial<PowerCheckpoint>) => void;
  generateDismantleReport: (info: { date: string; operator: string; supervisor: string }, checkpoints: PowerCheckpoint[]) => Promise<void>;
}

const STORAGE_KEY_RECORDS = 'mall_atrium_approval_records';
const STORAGE_KEY_CHECKPOINTS = 'mall_atrium_checkpoints';

const loadRecords = (): ApprovalRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load records from storage:', e);
  }
  return sampleApprovalRecords;
};

const saveRecords = (records: ApprovalRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records to storage:', e);
  }
};

const loadCheckpoints = (): PowerCheckpoint[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load checkpoints from storage:', e);
  }
  return createPowerCheckpoints();
};

const saveCheckpoints = (checkpoints: PowerCheckpoint[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKPOINTS, JSON.stringify(checkpoints));
  } catch (e) {
    console.error('Failed to save checkpoints to storage:', e);
  }
};

export const useApprovalStore = create<ApprovalState>((set, get) => {
  const initialRecords = loadRecords();
  const initialCheckpoints = loadCheckpoints();
  
  return {
    approvalRecords: initialRecords,
    powerCheckpoints: initialCheckpoints,
    addApprovalRecord: (plan) =>
      set((state) => {
        const newRecord: ApprovalRecord = {
          ...plan,
          id: uuidv4(),
          projectName: plan.projectName || '未命名项目',
          brandName: plan.brandName || '未命名品牌',
          date: plan.date || new Date().toISOString().split('T')[0],
          status: plan.status || 'pending',
          objects: plan.objects || [],
          risks: plan.risks || [],
          createdAt: new Date().toISOString(),
        } as ApprovalRecord;
        const newRecords = [...state.approvalRecords, newRecord];
        saveRecords(newRecords);
        return { approvalRecords: newRecords };
      }),
    updateApprovalRecord: (id, updates) =>
      set((state) => {
        const newRecords = state.approvalRecords.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        );
        saveRecords(newRecords);
        return { approvalRecords: newRecords };
      }),
    updatePowerCheckpoint: (id, updates) =>
      set((state) => {
        const newCheckpoints = state.powerCheckpoints.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        );
        saveCheckpoints(newCheckpoints);
        return { powerCheckpoints: newCheckpoints };
      }),
    generateDismantleReport: async (info, checkpoints) => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('撤展电源点核对清单', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`撤展日期: ${info.date}`, 20, yPosition);
      yPosition += 8;
      doc.text(`操作员: ${info.operator || '未填写'}`, 20, yPosition);
      yPosition += 8;
      doc.text(`现场负责人: ${info.supervisor || '未填写'}`, 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('序号', 20, yPosition);
      doc.text('电源点', 45, yPosition);
      doc.text('位置', 80, yPosition);
      doc.text('状态', 140, yPosition);
      doc.text('核对人', 170, yPosition);
      yPosition += 6;
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      checkpoints.forEach((cp, idx) => {
        if (yPosition + 15 > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(10);
        }
        
        doc.text(String(idx + 1), 20, yPosition);
        doc.text(cp.name, 45, yPosition);
        doc.text(cp.location, 80, yPosition);
        
        if (cp.status === 'checked') {
          doc.setTextColor(34, 197, 94);
          doc.text('✓ 已核对', 140, yPosition);
        } else if (cp.status === 'issue') {
          doc.setTextColor(220, 38, 38);
          doc.text('✗ 有问题', 140, yPosition);
        } else {
          doc.setTextColor(234, 179, 8);
          doc.text('○ 待核对', 140, yPosition);
        }
        doc.setTextColor(0, 0, 0);
        
        doc.text(cp.checkedBy || '____', 170, yPosition);
        yPosition += 8;
        doc.line(20, yPosition, 115, yPosition);
        yPosition += 4;
      });

      const checkedCount = checkpoints.filter(c => c.status === 'checked').length;
      const totalCount = checkpoints.length;
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`核对进度: ${checkedCount}/${totalCount} 个电源点已完成`, 20, yPosition);
      
      if (checkedCount === totalCount) {
        doc.setTextColor(34, 197, 94);
        yPosition += 8;
        doc.text('✅ 所有电源点已核对完成，撤展工作完成', 20, yPosition);
        doc.setTextColor(0, 0, 0);
      }

      yPosition += 20;
      doc.line(120, yPosition, 190, yPosition);
      yPosition += 8;
      doc.text('物业核对人签字: _______________', 120, yPosition);

      doc.save(`撤展电源核对单_${info.date}.pdf`);
    },
  };
});
