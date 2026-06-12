import { create } from 'zustand';
import type {
  Staff,
  StaffStatus,
  Scenario,
  AnswerRecord,
  StaffStats,
  ErrorCategory,
} from '@/types';
import { INITIAL_STAFF, generateStaffId, AVATAR_OPTIONS } from '@/data/staff';
import { ScenarioGenerator } from '@/utils/scenarioGenerator';
import { AmountCalculator } from '@/utils/amountCalculator';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_MANAGER_PASSWORD } from '@/utils/constants';
import { parseAmount } from '@/utils/formatters';

interface AppStore {
  staffList: Staff[];
  currentStaff: Staff | null;
  currentScenario: Scenario | null;
  isManagerMode: boolean;
  answerRecords: Record<string, AnswerRecord[]>;
  staffStats: Record<string, StaffStats>;
  
  loadStaffList: () => void;
  selectStaff: (staffId: string) => void;
  addStaff: (name: string) => void;
  updateStaffStatus: (staffId: string, status: StaffStatus, note?: string) => void;
  resetStaffProgress: (staffId: string) => void;
  
  generateNewScenario: (staffId?: string) => void;
  replayScenario: (scenarioId: string, staffId: string) => void;
  
  submitAnswer: (
    staffId: string,
    inputs: { finalTotal?: number; changeAmount?: number; refundAmount?: number }
  ) => { isCorrect: boolean; wrongFields: string[]; explanations: string[] };
  
  loadRecords: (staffId: string) => void;
  getUnpassedScenarios: (staffId: string) => AnswerRecord[];
  getStatsByStaff: (staffId: string) => StaffStats | null;
  getAllStats: () => StaffStats[];
  
  enterManagerMode: (password: string) => boolean;
  exitManagerMode: () => void;
  
  determineErrorType: (scenario: Scenario, wrongFields: string[]) => ErrorCategory;
}

const createEmptyStats = (staffId: string): StaffStats => ({
  staffId,
  totalPractice: 0,
  correctCount: 0,
  wrongCount: 0,
  accuracy: 0,
  errorByType: {},
  unpassedScenarios: [],
  lastPracticeAt: new Date().toISOString(),
});

export const useAppStore = create<AppStore>((set, get) => ({
  staffList: [],
  currentStaff: null,
  currentScenario: null,
  isManagerMode: false,
  answerRecords: {},
  staffStats: {},

  loadStaffList: () => {
    const saved = getLocalStorage<Staff[]>(STORAGE_KEYS.STAFF_LIST, []);
    const staffList = saved.length > 0 ? saved : INITIAL_STAFF;
    if (saved.length === 0) {
      setLocalStorage(STORAGE_KEYS.STAFF_LIST, INITIAL_STAFF);
    }
    set({ staffList });
    
    const managerPwd = getLocalStorage<string>(STORAGE_KEYS.MANAGER_PASSWORD, '');
    if (!managerPwd) {
      setLocalStorage(STORAGE_KEYS.MANAGER_PASSWORD, DEFAULT_MANAGER_PASSWORD);
    }
  },

  selectStaff: (staffId: string) => {
    const { staffList } = get();
    const staff = staffList.find(s => s.id === staffId) || null;
    set({ currentStaff: staff });
    if (staff) {
      setLocalStorage(STORAGE_KEYS.CURRENT_STAFF, staff);
    }
  },

  addStaff: (name: string) => {
    const { staffList } = get();
    const newStaff: Staff = {
      id: generateStaffId(),
      name,
      avatar: AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)],
      status: 'observing',
      createdAt: new Date().toISOString(),
    };
    const updatedList = [...staffList, newStaff];
    set({ staffList: updatedList });
    setLocalStorage(STORAGE_KEYS.STAFF_LIST, updatedList);
    
    const stats = createEmptyStats(newStaff.id);
    setLocalStorage(`${STORAGE_KEYS.STATS_PREFIX}${newStaff.id}`, stats);
    setLocalStorage(`${STORAGE_KEYS.RECORDS_PREFIX}${newStaff.id}`, []);
  },

  updateStaffStatus: (staffId: string, status: StaffStatus, note?: string) => {
    const { staffList } = get();
    const updatedList = staffList.map(s =>
      s.id === staffId
        ? { ...s, status, statusNote: note || s.statusNote }
        : s
    );
    set({ staffList: updatedList });
    setLocalStorage(STORAGE_KEYS.STAFF_LIST, updatedList);
  },

  resetStaffProgress: (staffId: string) => {
    const stats = createEmptyStats(staffId);
    setLocalStorage(`${STORAGE_KEYS.STATS_PREFIX}${staffId}`, stats);
    setLocalStorage(`${STORAGE_KEYS.RECORDS_PREFIX}${staffId}`, []);
    
    const { staffStats, answerRecords } = get();
    set({
      staffStats: { ...staffStats, [staffId]: stats },
      answerRecords: { ...answerRecords, [staffId]: [] },
    });
  },

  generateNewScenario: (staffId?: string) => {
    const scenario = ScenarioGenerator.generate();
    if (staffId) {
      setLocalStorage(`${STORAGE_KEYS.SCENARIO_CACHE}${staffId}`, scenario);
    }
    set({ currentScenario: scenario });
  },

  replayScenario: (scenarioId: string, staffId: string) => {
    const records = getLocalStorage<AnswerRecord[]>(
      `${STORAGE_KEYS.RECORDS_PREFIX}${staffId}`,
      []
    );
    const record = records.find(r => r.scenarioId === scenarioId);
    if (record) {
      set({ currentScenario: record.scenario });
    }
  },

  submitAnswer: (staffId, inputs) => {
    const { currentScenario, determineErrorType } = get();
    if (!currentScenario) {
      return { isCorrect: false, wrongFields: [], explanations: [] };
    }

    const wrongFields: string[] = [];
    const requiredInputs = currentScenario.requiredInputs;

    requiredInputs.forEach(field => {
      const userValue = inputs[field];
      const correctValue = currentScenario[field];
      if (!AmountCalculator.verifyAnswer(userValue, correctValue)) {
        wrongFields.push(field);
      }
    });

    const isCorrect = wrongFields.length === 0;
    const record: AnswerRecord = {
      scenarioId: currentScenario.id,
      scenario: currentScenario,
      userInputs: inputs,
      isCorrect,
      wrongFields,
      attemptedAt: new Date().toISOString(),
      attempts: 1,
      errorType: isCorrect ? undefined : determineErrorType(currentScenario, wrongFields),
    };

    const records = getLocalStorage<AnswerRecord[]>(
      `${STORAGE_KEYS.RECORDS_PREFIX}${staffId}`,
      []
    );
    
    const existingIndex = records.findIndex(r => r.scenarioId === currentScenario.id);
    if (existingIndex >= 0) {
      record.attempts = records[existingIndex].attempts + 1;
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    setLocalStorage(`${STORAGE_KEYS.RECORDS_PREFIX}${staffId}`, records);

    const stats = getLocalStorage<StaffStats>(
      `${STORAGE_KEYS.STATS_PREFIX}${staffId}`,
      createEmptyStats(staffId)
    );
    
    stats.totalPractice++;
    if (isCorrect) {
      stats.correctCount++;
      stats.unpassedScenarios = stats.unpassedScenarios.filter(id => id !== currentScenario.id);
    } else {
      stats.wrongCount++;
      if (!stats.unpassedScenarios.includes(currentScenario.id)) {
        stats.unpassedScenarios.push(currentScenario.id);
      }
      if (record.errorType) {
        stats.errorByType[record.errorType] = (stats.errorByType[record.errorType] || 0) + 1;
      }
    }
    stats.accuracy = stats.totalPractice > 0
      ? Math.round((stats.correctCount / stats.totalPractice) * 100)
      : 0;
    stats.lastPracticeAt = new Date().toISOString();
    
    setLocalStorage(`${STORAGE_KEYS.STATS_PREFIX}${staffId}`, stats);

    const { answerRecords, staffStats } = get();
    set({
      answerRecords: { ...answerRecords, [staffId]: records },
      staffStats: { ...staffStats, [staffId]: stats },
    });

    return {
      isCorrect,
      wrongFields,
      explanations: currentScenario.ruleExplanations,
    };
  },

  loadRecords: (staffId: string) => {
    const records = getLocalStorage<AnswerRecord[]>(
      `${STORAGE_KEYS.RECORDS_PREFIX}${staffId}`,
      []
    );
    const stats = getLocalStorage<StaffStats>(
      `${STORAGE_KEYS.STATS_PREFIX}${staffId}`,
      createEmptyStats(staffId)
    );
    
    const { answerRecords, staffStats } = get();
    set({
      answerRecords: { ...answerRecords, [staffId]: records },
      staffStats: { ...staffStats, [staffId]: stats },
    });
  },

  getUnpassedScenarios: (staffId: string) => {
    const { answerRecords } = get();
    const records = answerRecords[staffId] || [];
    return records.filter(r => !r.isCorrect);
  },

  getStatsByStaff: (staffId: string) => {
    const { staffStats } = get();
    return staffStats[staffId] || null;
  },

  getAllStats: () => {
    const { staffList } = get();
    return staffList.map(staff => 
      getLocalStorage<StaffStats>(
        `${STORAGE_KEYS.STATS_PREFIX}${staff.id}`,
        createEmptyStats(staff.id)
      )
    );
  },

  enterManagerMode: (password: string) => {
    const savedPassword = getLocalStorage<string>(
      STORAGE_KEYS.MANAGER_PASSWORD,
      DEFAULT_MANAGER_PASSWORD
    );
    if (password === savedPassword) {
      set({ isManagerMode: true });
      return true;
    }
    return false;
  },

  exitManagerMode: () => {
    set({ isManagerMode: false });
  },

  determineErrorType: (scenario: Scenario, wrongFields: string[]): ErrorCategory => {
    if (scenario.specialEvent.type === 'exchange') return 'exchange';
    if (scenario.specialEvent.type === 'partial_refund') return 'partial_refund';
    if (scenario.specialEvent.type === 'damaged_coupon') return 'damaged_coupon';
    if (scenario.specialEvent.type === 'group_order') return 'group_order';
    
    const hasStacking = scenario.coupons.length > 1;
    const hasFullReduction = scenario.coupons.some(c => c.type === 'full_reduction');
    const hasDiscount = scenario.coupons.some(c => c.type === 'discount');
    const hasPoints = scenario.pointsDeduction > 0;
    
    if (wrongFields.includes('changeAmount')) return 'change';
    if (wrongFields.includes('refundAmount')) return 'partial_refund';
    if (hasStacking) return 'stacking';
    if (hasFullReduction) return 'full_reduction';
    if (hasDiscount) return 'discount';
    if (hasPoints) return 'points';
    
    return 'basic';
  },
}));
