import { create } from 'zustand';
import {
  Complaint,
  Attachment,
  RecognitionResult,
  MaterialType,
  MaterialGap,
  GapStatus,
  ComplaintStatus,
  AppSettings,
  PersistState,
} from '@/types';
import { recognizeMaterial, findGlobalOrderNo } from '@/utils/recognitionEngine';
import { generateNamingList } from '@/utils/namingGenerator';
import { checkMaterialGaps, detectScenario } from '@/utils/materialChecker';

const STORAGE_KEY = 'complaint-rater-v1';

const DEFAULT_SETTINGS: AppSettings = {
  namingTemplate: '{seq}-{type}-{orderNo}',
  sequencePadding: 2,
  maxHistory: 100,
};

const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

function createEmptyComplaint(partial?: Partial<Complaint>): Complaint {
  const now = new Date().toISOString();
  return {
    id: `cmp_${genId()}`,
    complaintNo: partial?.complaintNo || '',
    customerInfo: partial?.customerInfo || '',
    globalOrderNo: partial?.globalOrderNo || '',
    createdAt: now,
    updatedAt: now,
    status: 'DRAFT' as ComplaintStatus,
    attachments: [],
    recognitions: {},
    namingList: [],
    materialGaps: [],
    scenario: 'general',
    ...partial,
  };
}

function loadFromStorage(): PersistState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistState;
  } catch {
    return null;
  }
}

function saveToStorage(state: PersistState) {
  try {
    const clean = {
      ...state,
      complaints: state.complaints.map((c) => ({
        ...c,
        attachments: c.attachments.map((a) => {
          const { file: _file, previewUrl: _previewUrl, ...rest } = a;
          return { ...rest, previewUrl: '' };
        }),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Persist failed:', e);
  }
}

interface ComplaintStoreState {
  complaints: Complaint[];
  currentComplaintId: string | null;
  settings: AppSettings;

  typeOverrides: Record<string, MaterialType>;
  orderNoOverrides: Record<string, string>;
  sequenceOverrides: Record<string, number>;
  fileNameOverrides: Record<string, string>;

  recognitionStatus: 'idle' | 'running' | 'done';
}

interface ComplaintStoreActions {
  _persist: () => void;
  _touch: () => void;
  _refreshDerived: () => void;

  initStore: () => void;
  createNewComplaint: () => void;
  switchComplaint: (id: string) => void;
  deleteComplaint: (id: string) => void;

  setComplaintField: <K extends keyof Complaint>(key: K, value: Complaint[K]) => void;
  setScenario: (scenarioKey: string) => void;

  addAttachments: (files: File[]) => void;
  removeAttachment: (id: string) => void;
  setAttachmentField: (id: string, field: keyof Attachment, value: string) => void;

  runRecognition: (attachmentId?: string) => void;

  overrideMaterialType: (attachmentId: string, type: MaterialType | null) => void;
  overrideOrderNo: (attachmentId: string, orderNo: string | null) => void;
  overrideSequence: (attachmentId: string, sequence: number | null) => void;
  overrideFileName: (attachmentId: string, fileName: string | null) => void;
  moveItem: (attachmentId: string, direction: 'up' | 'down') => void;

  setGapStatus: (gapId: string, status: GapStatus) => void;
  confirmNaming: () => void;

  getComplaint: () => Complaint | undefined;
  getExportContext: () => {
    items: Attachment[];
    naming: any[];
    missing: any[];
    meta: any;
  };
}

export type ComplaintStore = ComplaintStoreState & ComplaintStoreActions;

export const useComplaintStore = create<ComplaintStore>((set, get) => ({
  complaints: [],
  currentComplaintId: null,
  settings: DEFAULT_SETTINGS,
  typeOverrides: {},
  orderNoOverrides: {},
  sequenceOverrides: {},
  fileNameOverrides: {},
  recognitionStatus: 'idle',

  _persist: () => {
    const { complaints, currentComplaintId, settings } = get();
    saveToStorage({ complaints, currentComplaintId, settings });
  },

  _touch: () => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    cmp.updatedAt = new Date().toISOString();
  },

  _refreshDerived: () => {
    const state = get();
    const cmp = state.getComplaint();
    if (!cmp) return;

    const namingCtx = {
      attachments: cmp.attachments,
      recognitions: cmp.recognitions,
      globalOrderNo: cmp.globalOrderNo,
      settings: state.settings,
      typeOverride: state.typeOverrides,
      orderNoOverride: state.orderNoOverrides,
      sequenceOverride: state.sequenceOverrides,
      fileNameOverride: state.fileNameOverrides,
    };
    cmp.namingList = generateNamingList(namingCtx);
    cmp.materialGaps = checkMaterialGaps(cmp, cmp.scenario);

    const global = findGlobalOrderNo(cmp.recognitions);
    if (global && !cmp.globalOrderNo) {
      cmp.globalOrderNo = global.orderNo;
    }
  },

  initStore: () => {
    const loaded = loadFromStorage();
    if (loaded) {
      set({
        complaints: loaded.complaints || [],
        currentComplaintId: loaded.currentComplaintId,
        settings: { ...DEFAULT_SETTINGS, ...(loaded.settings || {}) },
      });
    }

    const state = get();
    if (state.complaints.length === 0) {
      const mockData = buildMockComplaints();
      set({
        complaints: mockData,
        currentComplaintId: mockData[0].id,
      });
      get()._persist();
    } else if (!state.currentComplaintId) {
      set({ currentComplaintId: state.complaints[0]?.id || null });
    }
  },

  createNewComplaint: () => {
    const newCmp = createEmptyComplaint();
    set((state) => ({
      complaints: [newCmp, ...state.complaints].slice(0, state.settings.maxHistory),
      currentComplaintId: newCmp.id,
      typeOverrides: {},
      orderNoOverrides: {},
      sequenceOverrides: {},
      fileNameOverrides: {},
      recognitionStatus: 'idle',
    }));
    get()._persist();
  },

  switchComplaint: (id: string) => {
    set({
      currentComplaintId: id,
      typeOverrides: {},
      orderNoOverrides: {},
      sequenceOverrides: {},
      fileNameOverrides: {},
    });
  },

  deleteComplaint: (id: string) => {
    set((state) => {
      const rest = state.complaints.filter((c) => c.id !== id);
      const nextCurrent = state.currentComplaintId === id
        ? rest[0]?.id || null
        : state.currentComplaintId;
      return {
        complaints: rest,
        currentComplaintId: nextCurrent,
      };
    });
    get()._persist();
  },

  setComplaintField: (key, value) => {
    set((state) => {
      const complaints = state.complaints.map((c) =>
        c.id === state.currentComplaintId ? { ...c, [key]: value } : c,
      );
      return { complaints };
    });
    get()._touch();
  },

  setScenario: (scenarioKey: string) => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    cmp.scenario = scenarioKey;
    get()._refreshDerived();
    get()._touch();
    get()._persist();
    set({});
  },

  addAttachments: (files: File[]) => {
    const cmp = get().getComplaint();
    if (!cmp) return;

    const newAttachments: Attachment[] = files.map((file) => ({
      id: `att_${genId()}`,
      complaintId: cmp.id,
      originalName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      ocrText: '',
      description: '',
      file,
    }));

    cmp.attachments = [...cmp.attachments, ...newAttachments];

    newAttachments.forEach((att) => {
      cmp.recognitions[att.id] = recognizeMaterial(att, cmp.attachments);
    });

    get()._refreshDerived();
    get()._touch();
    get()._persist();
    set({});
  },

  removeAttachment: (id: string) => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    cmp.attachments = cmp.attachments.filter((a) => a.id !== id);
    delete cmp.recognitions[id];
    const overrides = get();
    const { [id]: _to, ...restType } = overrides.typeOverrides;
    const { [id]: _oo, ...restOrder } = overrides.orderNoOverrides;
    const { [id]: _so, ...restSeq } = overrides.sequenceOverrides;
    const { [id]: _fo, ...restFile } = overrides.fileNameOverrides;
    set({
      typeOverrides: restType,
      orderNoOverrides: restOrder,
      sequenceOverrides: restSeq,
      fileNameOverrides: restFile,
    });
    get()._refreshDerived();
    get()._touch();
    get()._persist();
  },

  setAttachmentField: (id, field, value) => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    const att = cmp.attachments.find((a) => a.id === id);
    if (!att) return;
    (att as any)[field] = value;

    cmp.recognitions[id] = recognizeMaterial(att, cmp.attachments);
    Object.values(cmp.recognitions).forEach((r) => {
      if (r.materialType === att.id as any) return;
    });
    cmp.attachments.forEach((a) => {
      if (a.id !== id) {
        cmp.recognitions[a.id] = recognizeMaterial(a, cmp.attachments);
      }
    });

    get()._refreshDerived();
    get()._touch();
    set({});
  },

  runRecognition: (attachmentId) => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    set({ recognitionStatus: 'running' });

    const targets = attachmentId ? [attachmentId] : cmp.attachments.map((a) => a.id);
    targets.forEach((tid) => {
      const att = cmp.attachments.find((a) => a.id === tid);
      if (att) cmp.recognitions[tid] = recognizeMaterial(att, cmp.attachments);
    });

    get()._refreshDerived();
    get()._touch();
    get()._persist();
    setTimeout(() => set({ recognitionStatus: 'done' }), 350);
    setTimeout(() => set({ recognitionStatus: 'idle' }), 1200);
  },

  overrideMaterialType: (attachmentId, type) => {
    set((state) => {
      const next = { ...state.typeOverrides };
      if (type === null) delete next[attachmentId];
      else next[attachmentId] = type;
      return { typeOverrides: next };
    });
    get()._refreshDerived();
    get()._persist();
  },

  overrideOrderNo: (attachmentId, orderNo) => {
    set((state) => {
      const next = { ...state.orderNoOverrides };
      if (orderNo === null || orderNo === '') delete next[attachmentId];
      else next[attachmentId] = orderNo;
      return { orderNoOverrides: next };
    });
    get()._refreshDerived();
    get()._persist();
  },

  overrideSequence: (attachmentId, sequence) => {
    set((state) => {
      const next = { ...state.sequenceOverrides };
      if (sequence === null) delete next[attachmentId];
      else next[attachmentId] = sequence;
      return { sequenceOverrides: next };
    });
    get()._refreshDerived();
    get()._persist();
  },

  overrideFileName: (attachmentId, fileName) => {
    set((state) => {
      const next = { ...state.fileNameOverrides };
      if (fileName === null || fileName === '') delete next[attachmentId];
      else next[attachmentId] = fileName;
      return { fileNameOverrides: next };
    });
    get()._refreshDerived();
    get()._persist();
  },

  moveItem: (attachmentId, direction) => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    const current = cmp.namingList.find((n) => n.attachmentId === attachmentId);
    if (!current) return;
    const targetSeq = direction === 'up' ? current.sequence - 1 : current.sequence + 1;
    if (targetSeq < 1 || targetSeq > cmp.namingList.length) return;
    const swapTarget = cmp.namingList.find((n) => n.sequence === targetSeq);
    if (!swapTarget) return;

    const newSeqs = { ...get().sequenceOverrides };
    newSeqs[attachmentId] = targetSeq;
    newSeqs[swapTarget.attachmentId] = current.sequence;
    set({ sequenceOverrides: newSeqs });

    get()._refreshDerived();
    get()._persist();
  },

  setGapStatus: (gapId, status) => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    const gap = cmp.materialGaps.find((g) => g.id === gapId);
    if (gap) gap.status = status;
    get()._persist();
    set({});
  },

  confirmNaming: () => {
    const cmp = get().getComplaint();
    if (!cmp) return;
    cmp.status = 'CONFIRMED';
    cmp.confirmedAt = new Date().toISOString();
    get()._touch();
    get()._persist();
    set({});
  },

  getComplaint: () => {
    const state = get();
    return state.complaints.find((c) => c.id === state.currentComplaintId);
  },

  getExportContext: () => {
    const state = get();
    const cmp = state.getComplaint()!;
    return {
      items: cmp.attachments,
      naming: cmp.namingList,
      missing: cmp.materialGaps
        .filter((g) => g.status === GapStatus.MISSING)
        .map((g) => ({
          name: g.materialName,
          status: '待补充',
          isRequired: g.isRequired,
          description: g.description,
        })),
      meta: {
        complaintNo: cmp.complaintNo,
        customerInfo: cmp.customerInfo,
        scenario: detectScenario(cmp.recognitions)[0]?.scenario || cmp.scenario,
        globalOrderNo: cmp.globalOrderNo,
        createdAt: cmp.createdAt,
      },
    };
  },
}));

function buildMockComplaints(): Complaint[] {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  const c1 = createEmptyComplaint({
    complaintNo: 'TS-2025-0618-001',
    customerInfo: '王女士 138****6521 天猫旗舰店',
    globalOrderNo: 'TB88120345678901234',
    createdAt: daysAgo(0),
    scenario: 'quality',
    status: 'DRAFT',
  });

  const mockAttachmentsC1: Array<{ name: string; ocr: string; desc: string; size: number }> = [
    {
      name: 'IMG_20250617_142301.jpg',
      ocr: '订单详情\n天猫旗舰店 购买成功\n订单编号：TB88120345678901234\n商品：高端女士真丝连衣裙 L码\n实付款：￥899.00\n下单时间：2025-06-12 15:32:01\n发货时间：2025-06-13 09:15',
      desc: '订单截图',
      size: 845231,
    },
    {
      name: 'Screenshot_2025-06-17-14-25-33.png',
      ocr: '【旺旺聊天记录】\n王女士：收到的裙子有明显的勾丝和走线问题，照片已经拍了\n客服小美：亲您好，非常抱歉给您带来不便，能把照片发给我们确认吗？\n王女士：已经上传了，好几处呢，这质量也太差了吧\n客服小美：亲这边马上为您申请退换货，运费我们承担哈',
      desc: '与客服聊天记录',
      size: 612480,
    },
    {
      name: 'PIC_20250617_001.jpg',
      ocr: '（实物照片 无文字）',
      desc: '裙身勾丝部位实拍',
      size: 1254320,
    },
    {
      name: 'PIC_20250617_002.jpg',
      ocr: '（实物照片 无文字）',
      desc: '走线不齐处放大',
      size: 1102450,
    },
  ];

  c1.attachments = mockAttachmentsC1.map((m) => ({
    id: `att_${genId()}`,
    complaintId: c1.id,
    originalName: m.name,
    fileType: 'image/jpeg',
    fileSize: m.size,
    previewUrl: '',
    ocrText: m.ocr,
    description: m.desc,
  }));
  c1.attachments.forEach((a) => {
    c1.recognitions[a.id] = recognizeMaterial(a, c1.attachments);
  });

  const naming1 = generateNamingList({
    attachments: c1.attachments,
    recognitions: c1.recognitions,
    globalOrderNo: c1.globalOrderNo,
    settings: DEFAULT_SETTINGS,
    typeOverride: {},
    orderNoOverride: {},
    sequenceOverride: {},
    fileNameOverride: {},
  });
  c1.namingList = naming1;
  c1.materialGaps = checkMaterialGaps(c1, 'quality');

  const c2 = createEmptyComplaint({
    complaintNo: 'TS-2025-0617-014',
    customerInfo: '李先生 京东自营 退货问题',
    globalOrderNo: 'JD2304567890123',
    createdAt: daysAgo(1),
    scenario: 'return',
    status: 'CONFIRMED',
    confirmedAt: daysAgo(1),
  });

  const mockAttachmentsC2 = [
    {
      name: 'wx_camera_1718592000000.jpg',
      ocr: '京东 订单详情\n订单号：JD2304567890123\n商品：Apple AirPods Pro 2代\n实付金额：￥1699.00\n下单：2025-06-10\n状态：申请退货中',
      desc: '京东订单详情',
      size: 720000,
    },
    {
      name: 'mmexport1718592012345.png',
      ocr: '退款详情\n退款类型：退货退款\n退款金额：￥1699.00\n申请原因：功能异常（降噪失效）\n申请时间：2025-06-15 10:22\n处理状态：商家审核中\n退货地址：上海市浦东新区xxx仓储中心',
      desc: '售后申请页面',
      size: 520300,
    },
    {
      name: 'IMG_0485.JPG',
      ocr: '顺丰速运\n运单号：SF1234567890123\n寄件人：李先生 139****8888\n收件人：京东售后仓\n收件地址：上海市浦东新区xxx路xxx号',
      desc: '寄出快递面单',
      size: 980000,
    },
  ];
  c2.attachments = mockAttachmentsC2.map((m) => ({
    id: `att_${genId()}`,
    complaintId: c2.id,
    originalName: m.name,
    fileType: 'image/jpeg',
    fileSize: m.size,
    previewUrl: '',
    ocrText: m.ocr,
    description: m.desc,
  }));
  c2.attachments.forEach((a) => {
    c2.recognitions[a.id] = recognizeMaterial(a, c2.attachments);
  });
  c2.namingList = generateNamingList({
    attachments: c2.attachments,
    recognitions: c2.recognitions,
    globalOrderNo: c2.globalOrderNo,
    settings: DEFAULT_SETTINGS,
    typeOverride: {},
    orderNoOverride: {},
    sequenceOverride: {},
    fileNameOverride: {},
  });
  c2.materialGaps = checkMaterialGaps(c2, 'return');

  const c3 = createEmptyComplaint({
    complaintNo: 'TS-2025-0615-008',
    customerInfo: '张先生 拼多多 物流破损',
    globalOrderNo: 'PDD200615008877665',
    createdAt: daysAgo(4),
    scenario: 'logistics',
    status: 'EXPORTED',
    confirmedAt: daysAgo(3),
    exportedAt: daysAgo(3),
  });
  const mockAttachmentsC3 = [
    {
      name: 'screenshot_0615.png',
      ocr: '【拼多多】订单信息\n订单号：PDD200615008877665\n商品：景德镇陶瓷茶具套装\n价格：￥358.00\n物流：中通快递 73120456789012',
      desc: '订单截图',
      size: 430210,
    },
    {
      name: 'pic_001.jpg',
      ocr: '中通快递 外包装明显破损，内物... 照片仅拍到一半',
      desc: '外包装破损照片',
      size: 1150000,
    },
    {
      name: 'pic_002.jpg',
      ocr: '（照片仅拍到茶壶一角）',
      desc: '内物破损照（截半）',
      size: 870000,
    },
  ];
  c3.attachments = mockAttachmentsC3.map((m) => ({
    id: `att_${genId()}`,
    complaintId: c3.id,
    originalName: m.name,
    fileType: 'image/jpeg',
    fileSize: m.size,
    previewUrl: '',
    ocrText: m.ocr,
    description: m.desc,
  }));
  c3.attachments.forEach((a) => {
    c3.recognitions[a.id] = recognizeMaterial(a, c3.attachments);
  });
  c3.namingList = generateNamingList({
    attachments: c3.attachments,
    recognitions: c3.recognitions,
    globalOrderNo: c3.globalOrderNo,
    settings: DEFAULT_SETTINGS,
    typeOverride: {},
    orderNoOverride: {},
    sequenceOverride: {},
    fileNameOverride: {},
  });
  c3.materialGaps = checkMaterialGaps(c3, 'logistics');

  return [c1, c2, c3];
}
