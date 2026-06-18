import { create } from 'zustand';
import type { TrainingCase, TrainingRecord, Student, CurrentUser, StudentAnswer, Casualty, Resources, SpecialEvent } from '../types';
import { getCases, saveCases, getRecords, saveRecord, getStudents, saveStudents, getCurrentUser, setCurrentUser, generateId } from '../utils/storage';
import { calculateScore } from '../utils/scoring';

interface GameState {
  currentCase: TrainingCase | null;
  casualties: Casualty[];
  resources: Resources;
  answers: StudentAnswer[];
  selectedCasualtyId: string | null;
  startTime: number;
  elapsedTime: number;
  isPlaying: boolean;
  triggeredEvents: string[];
  currentEvent: SpecialEvent | null;
  
  startTraining: (caseData: TrainingCase) => void;
  selectCasualty: (id: string | null) => void;
  setTriageLevel: (casualtyId: string, level: string) => void;
  updatePriority: (orderedIds: string[]) => void;
  submitAnswer: (studentName: string) => TrainingRecord | null;
  resetGame: () => void;
  setElapsedTime: (time: number) => void;
  triggerEvent: (event: SpecialEvent) => void;
  dismissEvent: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentCase: null,
  casualties: [],
  resources: { stretchers: 0, medics: 0, ambulances: 0 },
  answers: [],
  selectedCasualtyId: null,
  startTime: 0,
  elapsedTime: 0,
  isPlaying: false,
  triggeredEvents: [],
  currentEvent: null,
  
  startTraining: (caseData: TrainingCase) => {
    set({
      currentCase: caseData,
      casualties: [...caseData.casualties],
      resources: { ...caseData.resources },
      answers: caseData.casualties.map((c, i) => ({
        casualtyId: c.id,
        selectedLevel: 'green',
        priority: i + 1,
      })),
      selectedCasualtyId: null,
      startTime: Date.now(),
      elapsedTime: 0,
      isPlaying: true,
      triggeredEvents: [],
      currentEvent: null,
    });
  },
  
  selectCasualty: (id) => {
    set({ selectedCasualtyId: id });
  },
  
  setTriageLevel: (casualtyId, level) => {
    set((state) => ({
      answers: state.answers.map(a =>
        a.casualtyId === casualtyId ? { ...a, selectedLevel: level as any } : a
      ),
    }));
  },
  
  updatePriority: (orderedIds) => {
    set((state) => ({
      answers: state.answers.map(a => ({
        ...a,
        priority: orderedIds.indexOf(a.casualtyId) + 1,
      })),
    }));
  },
  
  submitAnswer: (studentName) => {
    const state = get();
    if (!state.currentCase) return null;
    
    const { totalScore, accuracy, levelAccuracy, mistakes } = calculateScore(
      state.casualties,
      state.answers
    );
    
    const record: TrainingRecord = {
      id: generateId('rec'),
      studentName,
      caseId: state.currentCase.id,
      caseName: state.currentCase.name,
      startTime: state.startTime,
      endTime: Date.now(),
      duration: state.elapsedTime,
      answers: [...state.answers],
      score: totalScore,
      accuracy,
      levelAccuracy,
      mistakes,
      difficulty: state.currentCase.difficulty,
      scenario: state.currentCase.scenario,
    };
    
    saveRecord(record);
    
    set({ isPlaying: false });
    
    return record;
  },
  
  resetGame: () => {
    set({
      currentCase: null,
      casualties: [],
      resources: { stretchers: 0, medics: 0, ambulances: 0 },
      answers: [],
      selectedCasualtyId: null,
      startTime: 0,
      elapsedTime: 0,
      isPlaying: false,
      triggeredEvents: [],
      currentEvent: null,
    });
  },
  
  setElapsedTime: (time) => {
    set({ elapsedTime: time });
  },
  
  triggerEvent: (event) => {
    const state = get();
    if (state.triggeredEvents.includes(event.id)) return;
    
    if (event.resourceChange) {
      set((s) => ({
        resources: {
          stretchers: s.resources.stretchers + (event.resourceChange?.stretchers || 0),
          medics: s.resources.medics + (event.resourceChange?.medics || 0),
          ambulances: s.resources.ambulances + (event.resourceChange?.ambulances || 0),
        },
      }));
    }
    
    if (event.newCasualty) {
      set((s) => ({
        casualties: [...s.casualties, event.newCasualty!],
        answers: [
          ...s.answers,
          {
            casualtyId: event.newCasualty!.id,
            selectedLevel: 'green',
            priority: s.answers.length + 1,
          },
        ],
      }));
    }
    
    set((s) => ({
      triggeredEvents: [...s.triggeredEvents, event.id],
      currentEvent: event,
    }));
  },
  
  dismissEvent: () => {
    set({ currentEvent: null });
  },
}));

interface AdminState {
  cases: TrainingCase[];
  records: TrainingRecord[];
  students: Student[];
  
  loadData: () => void;
  addCase: (caseData: Omit<TrainingCase, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCase: (id: string, caseData: Partial<TrainingCase>) => void;
  removeCase: (id: string) => void;
  getCase: (id: string) => TrainingCase | undefined;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  cases: [],
  records: [],
  students: [],
  
  loadData: () => {
    set({
      cases: getCases(),
      records: getRecords(),
      students: getStudents(),
    });
  },
  
  addCase: (caseData) => {
    const newCase: TrainingCase = {
      ...caseData,
      id: generateId('case'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const cases = [...get().cases, newCase];
    saveCases(cases);
    set({ cases });
  },
  
  updateCase: (id, caseData) => {
    const cases = get().cases.map(c =>
      c.id === id ? { ...c, ...caseData, updatedAt: Date.now() } : c
    );
    saveCases(cases);
    set({ cases });
  },
  
  removeCase: (id) => {
    const cases = get().cases.filter(c => c.id !== id);
    saveCases(cases);
    set({ cases });
  },
  
  getCase: (id) => {
    return get().cases.find(c => c.id === id);
  },
}));

interface UserState {
  currentUser: CurrentUser | null;
  
  loadUser: () => void;
  login: (user: CurrentUser) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  
  loadUser: () => {
    const user = getCurrentUser();
    set({ currentUser: user });
  },
  
  login: (user) => {
    setCurrentUser(user);
    set({ currentUser: user });
  },
  
  logout: () => {
    setCurrentUser(null);
    set({ currentUser: null });
  },
}));
