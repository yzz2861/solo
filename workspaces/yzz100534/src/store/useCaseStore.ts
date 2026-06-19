import { create } from 'zustand';
import type { Case, Evidence, DetectionResult, SupplementItem, TimelineNode, EvidenceType } from '../types';
import { createMockCase } from '../data/mockData';

interface CaseStore {
  currentCase: Case;
  setCurrentCase: (caseData: Case) => void;
  addEvidence: (evidence: Evidence) => void;
  updateEvidence: (id: string, updates: Partial<Evidence>) => void;
  removeEvidence: (id: string) => void;
  addDetection: (detection: DetectionResult) => void;
  updateDetection: (id: string, updates: Partial<DetectionResult>) => void;
  resolveDetection: (id: string) => void;
  addSupplement: (supplement: SupplementItem) => void;
  updateSupplement: (id: string, updates: Partial<SupplementItem>) => void;
  removeSupplement: (id: string) => void;
  addTimelineNode: (node: TimelineNode) => void;
  updateTimelineNode: (id: string, updates: Partial<TimelineNode>) => void;
  removeTimelineNode: (id: string) => void;
  setInternalNotes: (notes: string) => void;
  setSupplementDeadline: (deadline?: Date) => void;
  setCaseStatus: (status: Case['status']) => void;
  getEvidencesByType: (type: EvidenceType) => Evidence[];
  runAllDetections: () => void;
  generateSupplements: () => void;
  generateTimeline: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialCase: Case = createMockCase();

export const useCaseStore = create<CaseStore>((set, get) => ({
  currentCase: initialCase,

  setCurrentCase: (caseData) => set({ currentCase: caseData }),

  addEvidence: (evidence) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        evidences: [...state.currentCase.evidences, evidence],
        updatedAt: new Date(),
      },
    })),

  updateEvidence: (id, updates) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        evidences: state.currentCase.evidences.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
        updatedAt: new Date(),
      },
    })),

  removeEvidence: (id) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        evidences: state.currentCase.evidences.filter((e) => e.id !== id),
        updatedAt: new Date(),
      },
    })),

  addDetection: (detection) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        detections: [...state.currentCase.detections, detection],
        updatedAt: new Date(),
      },
    })),

  updateDetection: (id, updates) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        detections: state.currentCase.detections.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
        updatedAt: new Date(),
      },
    })),

  resolveDetection: (id) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        detections: state.currentCase.detections.map((d) =>
          d.id === id ? { ...d, resolved: true } : d
        ),
        updatedAt: new Date(),
      },
    })),

  addSupplement: (supplement) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        supplements: [...state.currentCase.supplements, supplement],
        updatedAt: new Date(),
      },
    })),

  updateSupplement: (id, updates) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        supplements: state.currentCase.supplements.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
        updatedAt: new Date(),
      },
    })),

  removeSupplement: (id) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        supplements: state.currentCase.supplements.filter((s) => s.id !== id),
        updatedAt: new Date(),
      },
    })),

  addTimelineNode: (node) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        timeline: [...state.currentCase.timeline, node].sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        ),
        updatedAt: new Date(),
      },
    })),

  updateTimelineNode: (id, updates) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        timeline: state.currentCase.timeline
          .map((n) => (n.id === id ? { ...n, ...updates } : n))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
        updatedAt: new Date(),
      },
    })),

  removeTimelineNode: (id) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        timeline: state.currentCase.timeline.filter((n) => n.id !== id),
        updatedAt: new Date(),
      },
    })),

  setInternalNotes: (notes) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        internalNotes: notes,
        updatedAt: new Date(),
      },
    })),

  setSupplementDeadline: (deadline) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        supplementDeadline: deadline,
        updatedAt: new Date(),
      },
    })),

  setCaseStatus: (status) =>
    set((state) => ({
      currentCase: {
        ...state.currentCase,
        status,
        updatedAt: new Date(),
      },
    })),

  getEvidencesByType: (type) => {
    return get().currentCase.evidences.filter((e) => e.type === type);
  },

  runAllDetections: () => {
    const { evidences } = get().currentCase;
    const newDetections: DetectionResult[] = [];

    const fileMap = new Map<string, Evidence[]>();
    evidences.forEach((e) => {
      const key = `${e.fileSize}-${e.fileName.split('.')[0]}`;
      const existing = fileMap.get(key) || [];
      fileMap.set(key, [...existing, e]);
    });

    fileMap.forEach((files) => {
      if (files.length > 1) {
        files.forEach((file, index) => {
          if (index > 0) {
            newDetections.push({
              id: generateId(),
              evidenceId: file.id,
              type: 'duplicate_file',
              severity: 'low',
              description: `检测到重复附件：${file.fileName} 与其他文件重复`,
              suggestion: '请确认是否为同一文件，如重复请删除多余副本',
              resolved: false,
            });
          }
        });
      }
    });

    const chatEvidences = evidences.filter((e) => e.type === 'chat_screenshot');
    chatEvidences.forEach((evidence) => {
      if (evidence.fileSize < 100000) {
        newDetections.push({
          id: generateId(),
          evidenceId: evidence.id,
          type: 'cropped_screenshot',
          severity: 'high',
          description: `聊天截图「${evidence.title}」可能不完整，文件偏小`,
          suggestion: '请检查截图是否完整，需包含完整的对话上下文',
          resolved: false,
        });
      }
    });

    const inspectionEvidences = evidences.filter((e) => e.type === 'inspection_report');
    inspectionEvidences.forEach((evidence) => {
      if (!evidence.title.includes('签名') && !evidence.description.includes('签名')) {
        newDetections.push({
          id: generateId(),
          evidenceId: evidence.id,
          type: 'missing_signature',
          severity: 'high',
          description: `检测单「${evidence.title}」未检测到签名信息`,
          suggestion: '请确认检测单是否有检测人员签名和盖章',
          resolved: false,
        });
      }
    });

    const customerStatements = evidences.filter((e) => e.type === 'customer_statement');
    if (customerStatements.length >= 2) {
      const text1 = customerStatements[0].description.toLowerCase();
      const text2 = customerStatements[1].description.toLowerCase();
      const hasContradiction = 
        (text1.includes('未收到') && text2.includes('已收到')) ||
        (text1.includes('已收到') && text2.includes('未收到')) ||
        (text1.includes('没签收') && text2.includes('已签收')) ||
        (text1.includes('已签收') && text2.includes('没签收'));

      if (hasContradiction) {
        newDetections.push({
          id: generateId(),
          type: 'contradictory_statement',
          severity: 'high',
          description: '客户不同时间的陈述存在矛盾点',
          suggestion: '请向客户核实真实情况，确认一致的说法',
          resolved: false,
        });
      }
    }

    const requiredTypes: EvidenceType[] = ['chat_screenshot', 'logistics_photo', 'inspection_report', 'customer_statement'];
    requiredTypes.forEach((type) => {
      const hasType = evidences.some((e) => e.type === type);
      if (!hasType) {
        const typeLabels: Record<EvidenceType, string> = {
          chat_screenshot: '聊天截图',
          logistics_photo: '物流照片',
          inspection_report: '检测单',
          customer_statement: '客户说明',
        };
        newDetections.push({
          id: generateId(),
          type: 'missing_evidence',
          severity: 'medium',
          description: `缺少${typeLabels[type]}类型的证据`,
          suggestion: `请补充${typeLabels[type]}作为证据材料`,
          resolved: false,
        });
      }
    });

    set((state) => ({
      currentCase: {
        ...state.currentCase,
        detections: newDetections,
        updatedAt: new Date(),
      },
    }));
  },

  generateSupplements: () => {
    const { detections } = get().currentCase;
    const supplements: SupplementItem[] = [];

    detections.forEach((detection) => {
      if (!detection.resolved) {
        supplements.push({
          id: generateId(),
          caseId: get().currentCase.id,
          title: detection.description,
          description: detection.suggestion,
          priority: detection.severity,
          questionToCustomer: detection.suggestion,
          internalNote: detection.type === 'contradictory_statement' ? '内部注意：客户说法有出入，需谨慎核实' : '',
          isSensitive: detection.type === 'contradictory_statement',
          completed: false,
        });
      }
    });

    set((state) => ({
      currentCase: {
        ...state.currentCase,
        supplements,
        updatedAt: new Date(),
      },
    }));
  },

  generateTimeline: () => {
    const { evidences } = get().currentCase;
    const nodes: TimelineNode[] = [];

    evidences.forEach((evidence) => {
      const time = evidence.evidenceTime || evidence.uploadTime;
      const typeLabels: Record<EvidenceType, string> = {
        chat_screenshot: '聊天记录',
        logistics_photo: '物流凭证',
        inspection_report: '检测报告',
        customer_statement: '客户陈述',
      };

      nodes.push({
        id: generateId(),
        caseId: get().currentCase.id,
        time,
        title: typeLabels[evidence.type],
        description: evidence.title,
        evidenceIds: [evidence.id],
        type: 'evidence',
      });
    });

    nodes.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    set((state) => ({
      currentCase: {
        ...state.currentCase,
        timeline: nodes,
        updatedAt: new Date(),
      },
    }));
  },
}));
