import { create } from 'zustand';
import { 
  HelpRequest, 
  ReferralRecord, 
  ProcessLog, 
  GradingLevel,
  RequestStatus,
  ReferralType,
  ReferralStatus
} from '@/types';
import { 
  getAllRequests, 
  saveRequests,
  getAllReferrals,
  addReferral as storageAddReferral,
  updateReferral as storageUpdateReferral,
  addLog,
  getCurrentUser,
  getLogsByRequestId as getLogsFromStorage,
} from '@/services/storage';
import { gradeRequest, batchGradeRequests, createHelpRequest } from '@/services/grading';
import { generateId } from '@/utils/text';

interface AppState {
  requests: HelpRequest[];
  referrals: ReferralRecord[];
  currentUser: string;
  isLoading: boolean;
  loadData: () => void;
  addNewRequest: (content: string, source: 'manual' | 'batch' | 'file', submitTime?: string) => HelpRequest;
  addBatchRequests: (contents: Array<{ content: string; submitTime?: string }>) => HelpRequest[];
  gradeSingleRequest: (id: string) => void;
  gradeAllPending: () => void;
  confirmGrading: (id: string, level: GradingLevel, remark?: string) => void;
  closeRequest: (id: string, remark?: string) => void;
  createReferral: (
    requestId: string, 
    type: ReferralType, 
    toRole: string, 
    reason: string
  ) => void;
  updateReferralStatus: (
    id: string, 
    status: ReferralStatus, 
    remark?: string
  ) => void;
  getRequestById: (id: string) => HelpRequest | undefined;
  getReferralsByRequestId: (requestId: string) => ReferralRecord[];
  getLogsByRequestId: (requestId: string) => ProcessLog[];
  getRequestsByStatus: (status: RequestStatus) => HelpRequest[];
  getRequestsByLevel: (level: GradingLevel) => HelpRequest[];
}

const levelPriority: Record<GradingLevel, number> = {
  emergency: 5,
  psychology: 4,
  headteacher: 3,
  general: 2,
  review: 1,
};

const sortRequests = (requests: HelpRequest[]): HelpRequest[] => {
  return [...requests].sort((a, b) => {
    const levelA = a.confirmedLevel || a.gradingResult?.level || 'general';
    const levelB = b.confirmedLevel || b.gradingResult?.level || 'general';
    
    const priorityDiff = levelPriority[levelB] - levelPriority[levelA];
    if (priorityDiff !== 0) return priorityDiff;
    
    return new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime();
  });
};

export const useAppStore = create<AppState>((set, get) => ({
  requests: [],
  referrals: [],
  currentUser: getCurrentUser(),
  isLoading: false,
  
  loadData: () => {
    set({ isLoading: true });
    try {
      const requests = sortRequests(getAllRequests());
      const referrals = getAllReferrals();
      set({ 
        requests, 
        referrals,
        currentUser: getCurrentUser(),
        isLoading: false 
      });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ isLoading: false });
    }
  },
  
  addNewRequest: (content, source, submitTime) => {
    const request = createHelpRequest(content, source, submitTime);
    const { request: gradedRequest } = gradeRequest(request);
    
    set(state => {
      const newRequests = sortRequests([...state.requests, gradedRequest]);
      saveRequests(newRequests);
      return { requests: newRequests };
    });
    
    addLog({
      id: generateId(),
      requestId: gradedRequest.id,
      action: '导入求助',
      operator: get().currentUser,
      createdAt: new Date().toISOString(),
    });
    
    return gradedRequest;
  },
  
  addBatchRequests: (contents) => {
    const newRequests = contents.map(c => 
      createHelpRequest(c.content, 'batch', c.submitTime)
    );
    
    const results = batchGradeRequests(newRequests);
    const gradedRequests = results.map(r => r.request);
    
    set(state => {
      const allRequests = sortRequests([...state.requests, ...gradedRequests]);
      saveRequests(allRequests);
      return { requests: allRequests };
    });
    
    const currentUser = get().currentUser;
    gradedRequests.forEach(req => {
      addLog({
        id: generateId(),
        requestId: req.id,
        action: '批量导入',
        operator: currentUser,
        createdAt: new Date().toISOString(),
      });
    });
    
    return gradedRequests;
  },
  
  gradeSingleRequest: (id) => {
    const request = get().requests.find(r => r.id === id);
    if (!request) return;
    
    const { request: gradedRequest } = gradeRequest(request);
    
    set(state => {
      const newRequests = state.requests.map(r => 
        r.id === id ? gradedRequest : r
      );
      saveRequests(newRequests);
      return { requests: sortRequests(newRequests) };
    });
    
    addLog({
      id: generateId(),
      requestId: id,
      action: '重新分级',
      operator: get().currentUser,
      createdAt: new Date().toISOString(),
    });
  },
  
  gradeAllPending: () => {
    const pending = get().requests.filter(r => r.status === 'pending');
    const results = batchGradeRequests(pending);
    const gradedRequests = results.map(r => r.request);
    
    set(state => {
      const updated = state.requests.map(r => {
        const graded = gradedRequests.find(g => g.id === r.id);
        return graded || r;
      });
      saveRequests(updated);
      return { requests: sortRequests(updated) };
    });
    
    const currentUser = get().currentUser;
    gradedRequests.forEach(req => {
      addLog({
        id: generateId(),
        requestId: req.id,
        action: '自动分级',
        operator: currentUser,
        createdAt: new Date().toISOString(),
      });
    });
  },
  
  confirmGrading: (id, level, remark) => {
    set(state => {
      const newRequests = state.requests.map(r => {
        if (r.id === id) {
          const updated: HelpRequest = {
            ...r,
            status: 'confirmed',
            confirmedLevel: level,
            confirmedBy: state.currentUser,
            confirmedAt: new Date().toISOString(),
            processRemark: remark || r.processRemark,
          };
          return updated;
        }
        return r;
      });
      saveRequests(newRequests);
      return { requests: sortRequests(newRequests) };
    });
    
    addLog({
      id: generateId(),
      requestId: id,
      action: `确认分级为${level}`,
      operator: get().currentUser,
      remark,
      createdAt: new Date().toISOString(),
    });
  },
  
  closeRequest: (id, remark) => {
    set(state => {
      const newRequests = state.requests.map(r => {
        if (r.id === id) {
          const updated: HelpRequest = {
            ...r,
            status: 'closed',
            processRemark: remark || r.processRemark,
          };
          return updated;
        }
        return r;
      });
      saveRequests(newRequests);
      return { requests: sortRequests(newRequests) };
    });
    
    addLog({
      id: generateId(),
      requestId: id,
      action: '标记已处理',
      operator: get().currentUser,
      remark,
      createdAt: new Date().toISOString(),
    });
  },
  
  createReferral: (requestId, type, toRole, reason) => {
    const now = new Date().toISOString();
    const referral: ReferralRecord = {
      id: generateId(),
      requestId,
      fromRole: get().currentUser,
      toRole,
      referralType: type,
      reason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    
    storageAddReferral(referral);
    
    set(state => {
      const newRequests = state.requests.map(r => {
        if (r.id === requestId) {
          return { ...r, status: 'referred' as RequestStatus, updatedAt: now };
        }
        return r;
      });
      saveRequests(newRequests);
      return {
        requests: sortRequests(newRequests),
        referrals: [...state.referrals, referral],
      };
    });
    
    addLog({
      id: generateId(),
      requestId,
      action: `转介给${toRole}`,
      operator: get().currentUser,
      remark: reason,
      createdAt: now,
    });
  },
  
  updateReferralStatus: (id, status, remark) => {
    const now = new Date().toISOString();
    const referral = get().referrals.find(r => r.id === id);
    if (!referral) return;
    
    const updated: ReferralRecord = {
      ...referral,
      status,
      handledBy: get().currentUser,
      handledAt: now,
      handleRemark: remark,
      updatedAt: now,
    };
    
    storageUpdateReferral(updated);
    
    set(state => ({
      referrals: state.referrals.map(r => r.id === id ? updated : r),
    }));
    
    addLog({
      id: generateId(),
      requestId: referral.requestId,
      action: `转介${status}`,
      operator: get().currentUser,
      remark,
      createdAt: now,
    });
  },
  
  getRequestById: (id) => get().requests.find(r => r.id === id),
  
  getReferralsByRequestId: (requestId) => 
    get().referrals.filter(r => r.requestId === requestId),
  
  getLogsByRequestId: (requestId) => {
    return getLogsFromStorage(requestId);
  },
  
  getRequestsByStatus: (status) => 
    get().requests.filter(r => r.status === status),
  
  getRequestsByLevel: (level) => 
    get().requests.filter(r => {
      const rLevel = r.confirmedLevel || r.gradingResult?.level;
      return rLevel === level;
    }),
}));
