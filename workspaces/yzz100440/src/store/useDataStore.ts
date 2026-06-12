import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Elderly,
  Medication,
  Prescription,
  PillboxRecord,
  NurseRecord,
  MedicationAnalysis,
  DailyStatistics,
  FloorStatistics,
  ElderlyRisk,
  ElderlySummary,
  TimeSlot,
  MedicationStatus,
} from '../../shared/types';
import { generateAllMockData } from '../mock/dataGenerator';
import {
  analyzeMedicationDose,
  calculateAdherenceRate,
  getRiskLevel,
  sanitizeForFamily,
  getShiftForTimeSlot,
  TIME_SLOT_CONFIG,
} from '../utils/analysis';
import { getRecentDays, formatDate } from '../utils/format';
import { useAuthStore } from './useAuthStore';

interface DataState {
  elderlyList: Elderly[];
  medications: Medication[];
  prescriptions: Prescription[];
  pillboxRecords: PillboxRecord[];
  nurseRecords: NurseRecord[];
  isLoaded: boolean;
  loadMockData: () => void;
  analyzeElderlyMedications: (elderlyId: string, startDate: string, endDate: string) => MedicationAnalysis[];
  getDailyStatistics: (startDate: string, endDate: string, floor?: number) => DailyStatistics[];
  getFloorStatistics: (date: string) => FloorStatistics[];
  getElderlyRisks: (limit?: number) => ElderlyRisk[];
  getElderlySummary: (elderlyId: string) => ElderlySummary;
  importPillboxRecords: (records: PillboxRecord[]) => { success: boolean; imported: number };
  importNurseRecords: (records: NurseRecord[]) => { success: boolean; imported: number };
  importPrescriptions: (records: Prescription[]) => { success: boolean; imported: number };
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      elderlyList: [],
      medications: [],
      prescriptions: [],
      pillboxRecords: [],
      nurseRecords: [],
      isLoaded: false,

      loadMockData: () => {
        if (get().isLoaded) return;
        const data = generateAllMockData(30);
        set({
          elderlyList: data.elderlyList,
          medications: data.medications,
          prescriptions: data.prescriptions,
          pillboxRecords: data.pillboxRecords,
          nurseRecords: data.nurseRecords,
          isLoaded: true,
        });
      },

      analyzeElderlyMedications: (elderlyId: string, startDate: string, endDate: string) => {
        const state = get();
        const user = useAuthStore.getState().user;
        const isFamily = user?.role === 'family';

        const elderlyPrescriptions = state.prescriptions.filter(p => p.elderlyId === elderlyId);
        const elderlyPillbox = state.pillboxRecords.filter(r => r.elderlyId === elderlyId);
        const elderlyNurse = state.nurseRecords.filter(r => r.elderlyId === elderlyId);

        const days = getRecentDays(30);
        const filteredDays = days.filter(d => d >= startDate && d <= endDate);

        const results: MedicationAnalysis[] = [];

        elderlyPrescriptions.forEach(prescription => {
          const medication = state.medications.find(m => m.id === prescription.medicationId);
          if (!medication) return;

          const slots: TimeSlot[] = [];
          medication.times.forEach(time => {
            const [h] = time.split(':').map(Number);
            if (h >= 6 && h < 9) slots.push('breakfast');
            else if (h >= 11 && h < 14) slots.push('lunch');
            else if (h >= 17 && h < 20) slots.push('dinner');
            else if (h >= 21 || h < 2) slots.push('bedtime');
          });

          const uniqueSlots = [...new Set(slots)];

          filteredDays.forEach(date => {
            if (prescription.endDate && date > prescription.endDate) return;
            if (date < prescription.startDate) return;

            uniqueSlots.forEach(slot => {
              const slotConfig = TIME_SLOT_CONFIG[slot];
              const plannedTime = `${Math.floor(slotConfig.start).toString().padStart(2, '0')}:00`;

              const analysis = analyzeMedicationDose({
                elderlyId,
                medicationId: prescription.medicationId,
                medicationName: medication.name,
                date,
                timeSlot: slot,
                plannedTime,
                prescription,
                pillboxRecords: elderlyPillbox,
                nurseRecords: elderlyNurse,
              });

              results.push(isFamily ? sanitizeForFamily(analysis) : analysis);
            });
          });
        });

        return results.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          const slotOrder = ['breakfast', 'lunch', 'dinner', 'bedtime'];
          return slotOrder.indexOf(a.timeSlot) - slotOrder.indexOf(b.timeSlot);
        });
      },

      getDailyStatistics: (startDate: string, endDate: string, floor?: number) => {
        const state = get();
        const days = getRecentDays(30).filter(d => d >= startDate && d <= endDate);
        const elderlyToAnalyze = floor !== undefined
          ? state.elderlyList.filter(e => e.floor === floor)
          : state.elderlyList;

        return days.map(date => {
          const stats: DailyStatistics = {
            date,
            totalDoses: 0,
            taken: 0,
            missed: 0,
            late: 0,
            duplicate: 0,
            supplemented: 0,
            discontinued: 0,
            offline: 0,
            conflict: 0,
          };

          elderlyToAnalyze.forEach(elderly => {
            const records = state.analyzeElderlyMedications(elderly.id, date, date);
            records.forEach(record => {
              stats.totalDoses++;
              stats[record.status as keyof Omit<DailyStatistics, 'date' | 'totalDoses'>]++;
            });
          });

          return stats;
        });
      },

      getFloorStatistics: (date: string) => {
        const state = get();
        const floors = [...new Set(state.elderlyList.map(e => e.floor))].sort();

        return floors.map(floor => {
          const floorElderly = state.elderlyList.filter(e => e.floor === floor);
          const stats: FloorStatistics = {
            floor,
            totalDoses: 0,
            missedRate: 0,
            offlineRate: 0,
            shiftIssues: { morning: 0, afternoon: 0, night: 0 },
            deviceIssues: 0,
          };

          let missed = 0;
          let offline = 0;

          floorElderly.forEach(elderly => {
            const records = state.analyzeElderlyMedications(elderly.id, date, date);
            records.forEach(record => {
              stats.totalDoses++;
              
              if (record.status === 'missed' || record.status === 'late') {
                missed++;
                const shift = getShiftForTimeSlot(record.timeSlot);
                stats.shiftIssues[shift]++;
              }
              if (record.status === 'offline') {
                offline++;
                stats.deviceIssues++;
              }
              if (record.status === 'duplicate' || record.status === 'conflict') {
                stats.deviceIssues++;
              }
            });
          });

          stats.missedRate = stats.totalDoses > 0 ? (missed / stats.totalDoses) * 100 : 0;
          stats.offlineRate = stats.totalDoses > 0 ? (offline / stats.totalDoses) * 100 : 0;

          return stats;
        });
      },

      getElderlyRisks: (limit?: number) => {
        const state = get();
        const endDate = formatDate(new Date());
        const startDate = getRecentDays(30)[0];

        const risks: ElderlyRisk[] = state.elderlyList.map(elderly => {
          const records = state.analyzeElderlyMedications(elderly.id, startDate, endDate);
          const missedCount = records.filter(r => r.status === 'missed').length;
          const lateCount = records.filter(r => r.status === 'late').length;
          const rate = calculateAdherenceRate(records);

          return {
            elderlyId: elderly.id,
            name: elderly.name,
            floor: elderly.floor,
            roomNumber: elderly.roomNumber,
            missedCount,
            lateCount,
            riskLevel: getRiskLevel(missedCount, lateCount, records.length),
            last30DaysRate: rate,
          };
        });

        risks.sort((a, b) => (b.missedCount + b.lateCount) - (a.missedCount + a.lateCount));

        return limit ? risks.slice(0, limit) : risks;
      },

      getElderlySummary: (elderlyId: string) => {
        const state = get();
        const elderly = state.elderlyList.find(e => e.id === elderlyId);
        const endDate = formatDate(new Date());
        const startDate = getRecentDays(30)[0];

        const records = state.analyzeElderlyMedications(elderlyId, startDate, endDate);
        const adherenceRate = calculateAdherenceRate(records);

        const now = new Date();
        const monthStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const monthRecords = state.analyzeElderlyMedications(elderlyId, monthStart, endDate);
        
        const normal = monthRecords.filter(r => r.status === 'taken' || r.status === 'supplemented').length;
        const abnormal = monthRecords.filter(r => 
          r.status === 'missed' || r.status === 'late' || r.status === 'conflict'
        ).length;

        return {
          name: elderly?.name || '',
          adherenceRate,
          thisMonth: {
            total: monthRecords.length,
            normal,
            abnormal,
          },
          recentRecords: records.slice(-10),
        };
      },

      importPillboxRecords: (records: PillboxRecord[]) => {
        set(state => ({
          pillboxRecords: [...state.pillboxRecords, ...records],
        }));
        return { success: true, imported: records.length };
      },

      importNurseRecords: (records: NurseRecord[]) => {
        set(state => ({
          nurseRecords: [...state.nurseRecords, ...records],
        }));
        return { success: true, imported: records.length };
      },

      importPrescriptions: (records: Prescription[]) => {
        set(state => ({
          prescriptions: [...state.prescriptions, ...records],
        }));
        return { success: true, imported: records.length };
      },
    }),
    {
      name: 'medication-data',
    }
  )
);
