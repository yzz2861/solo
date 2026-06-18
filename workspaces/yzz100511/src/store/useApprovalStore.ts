import { create } from 'zustand';
import type { ApprovalRecord, PowerCheckpoint } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { sampleApprovalRecords, createPowerCheckpoints } from '../utils/mockData';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const renderChinesePdf = async (
  htmlContent: string,
  filename: string
): Promise<void> => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 595px;
    background: #ffffff;
    padding: 40px 30px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', sans-serif;
    color: #333333;
    line-height: 1.6;
    box-sizing: border-box;
  `;
  document.body.appendChild(container);
  container.innerHTML = htmlContent;

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 595,
    });
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let remainingHeight = imgHeight;
    let currentDrawY = 0;
    let pageCount = 0;
    
    while (remainingHeight > 0) {
      if (pageCount > 0) {
        doc.addPage();
      }
      
      const drawHeight = Math.min(remainingHeight, pageHeight - 20);
      
      const sliceCanvas = document.createElement('canvas');
      const srcY = (currentDrawY * canvas.width) / imgWidth;
      const srcHeight = (drawHeight * canvas.width) / imgWidth;
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.max(1, srcHeight);
      
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, Math.max(0, srcY),
          canvas.width, Math.max(1, srcHeight),
          0, 0,
          sliceCanvas.width, sliceCanvas.height
        );
        
        const sliceData = sliceCanvas.toDataURL('image/png');
        doc.addImage(sliceData, 'PNG', 10, 10, imgWidth, drawHeight);
      }
      
      remainingHeight -= drawHeight;
      currentDrawY += drawHeight;
      pageCount++;
    }
    
    doc.save(filename);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
};

export const useApprovalStore = create<ApprovalState>((set) => {
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
      const checkedCount = checkpoints.filter(c => c.status === 'checked').length;
      const totalCount = checkpoints.length;
      
      let tableRows = '';
      checkpoints.forEach((cp, idx) => {
        let statusText = '';
        let statusColor = '';
        if (cp.status === 'checked') {
          statusText = '✓ 已核对';
          statusColor = '#15803d';
        } else if (cp.status === 'issue') {
          statusText = '✗ 有问题';
          statusColor = '#dc2626';
        } else {
          statusText = '○ 待核对';
          statusColor = '#d97706';
        }
        
        tableRows += `
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; width: 10%;">${idx + 1}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; width: 25%;">${escapeHtml(cp.name)}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; width: 30%;">${escapeHtml(cp.location)}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; color: ${statusColor}; font-weight: bold; width: 20%;">${statusText}</td>
            <td style="border: 1px solid #e5e7eb; padding: 8px; width: 15%;">${escapeHtml(cp.checkedBy || '____')}</td>
          </tr>
        `;
      });

      const progressColor = checkedCount === totalCount ? '#15803d' : '#d97706';
      const allChecked = checkedCount === totalCount;

      const html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0;">撤展电源点核对清单</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>撤展日期:</strong> ${escapeHtml(info.date)}</p>
          <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>操作员:</strong> ${escapeHtml(info.operator || '未填写')}</p>
          <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>现场负责人:</strong> ${escapeHtml(info.supervisor || '未填写')}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">序号</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">电源点</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">位置</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">状态</th>
              <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">核对人</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin: 20px 0; padding: 15px; background: ${allChecked ? '#f0fdf4' : '#fffbeb'}; border-radius: 8px;">
          <p style="font-weight: bold; color: ${progressColor}; margin: 0 0 8px 0;">
            核对进度: ${checkedCount}/${totalCount} 个电源点已完成
          </p>
          ${allChecked ? '<p style="color: #15803d; margin: 0;">✅ 所有电源点已核对完成，撤展工作完成</p>' : ''}
        </div>
        
        <div style="margin-top: 50px; text-align: right; font-size: 12px; color: #6b7280;">
          <p style="margin-bottom: 8px;">物业核对人签字: _______________</p>
        </div>
      `;

      await renderChinesePdf(html, `撤展电源核对单_${info.date}.pdf`);
    },
  };
});
