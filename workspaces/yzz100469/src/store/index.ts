import { create } from 'zustand';
import type { InterviewRecord, Annotation, FollowUpQuestion, RevisionRecord } from '@/types';
import { generateMockRecords } from '@/store/mockData';

interface InterviewState {
  records: InterviewRecord[];
  currentRecordId: string | null;
  getCurrentRecord: () => InterviewRecord | null;
  createRecord: (data: Partial<InterviewRecord>) => InterviewRecord;
  setCurrentRecord: (id: string | null) => void;
  updateRecord: (id: string, updates: Partial<InterviewRecord>) => void;
  addAnnotation: (recordId: string, annotation: Annotation) => void;
  updateAnnotation: (recordId: string, annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (recordId: string, annotationId: string) => void;
  addFollowUp: (recordId: string, question: FollowUpQuestion) => void;
  updateFollowUp: (recordId: string, questionId: string, updates: Partial<FollowUpQuestion>) => void;
  deleteFollowUp: (recordId: string, questionId: string) => void;
  addRevision: (recordId: string, revision: RevisionRecord) => void;
  setAnnotations: (recordId: string, annotations: Annotation[]) => void;
  setFollowUps: (recordId: string, questions: FollowUpQuestion[]) => void;
}

const STORAGE_KEY = 'interview-bias-assistant-records';

function loadFromStorage(): InterviewRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load from storage', e);
  }
  const mockData = generateMockRecords();
  saveToStorage(mockData);
  return mockData;
}

function saveToStorage(records: InterviewRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save to storage', e);
  }
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  records: loadFromStorage(),
  currentRecordId: null,

  getCurrentRecord: () => {
    const { records, currentRecordId } = get();
    return records.find(r => r.id === currentRecordId) || null;
  },

  createRecord: (data) => {
    const now = Date.now();
    const newRecord: InterviewRecord = {
      id: `rec_${now}_${Math.random().toString(36).slice(2, 8)}`,
      candidateName: data.candidateName || '',
      position: data.position || '',
      round: data.round || 1,
      interviewerAlias: data.interviewerAlias || '',
      interviewDate: data.interviewDate || new Date().toISOString().split('T')[0],
      content: data.content || '',
      paragraphs: data.paragraphs || [],
      annotations: [],
      followUpQuestions: [],
      revisions: [],
      riskScore: 0,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const records = [...state.records, newRecord];
      saveToStorage(records);
      return { records, currentRecordId: newRecord.id };
    });
    return newRecord;
  },

  setCurrentRecord: (id) => set({ currentRecordId: id }),

  updateRecord: (id, updates) => {
    set((state) => {
      const records = state.records.map(r =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
      );
      saveToStorage(records);
      return { records };
    });
  },

  addAnnotation: (recordId, annotation) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          annotations: [...r.annotations, annotation],
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  updateAnnotation: (recordId, annotationId, updates) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          annotations: r.annotations.map(a =>
            a.id === annotationId ? { ...a, ...updates } : a
          ),
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  deleteAnnotation: (recordId, annotationId) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          annotations: r.annotations.filter(a => a.id !== annotationId),
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  addFollowUp: (recordId, question) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          followUpQuestions: [...r.followUpQuestions, question],
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  updateFollowUp: (recordId, questionId, updates) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          followUpQuestions: r.followUpQuestions.map(q =>
            q.id === questionId ? { ...q, ...updates } : q
          ),
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  deleteFollowUp: (recordId, questionId) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          followUpQuestions: r.followUpQuestions.filter(q => q.id !== questionId),
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  addRevision: (recordId, revision) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          revisions: [...r.revisions, revision],
          updatedAt: Date.now(),
        };
      });
      saveToStorage(records);
      return { records };
    });
  },

  setAnnotations: (recordId, annotations) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return { ...r, annotations, updatedAt: Date.now() };
      });
      saveToStorage(records);
      return { records };
    });
  },

  setFollowUps: (recordId, questions) => {
    set((state) => {
      const records = state.records.map(r => {
        if (r.id !== recordId) return r;
        return { ...r, followUpQuestions: questions, updatedAt: Date.now() };
      });
      saveToStorage(records);
      return { records };
    });
  },
}));
