import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  FermentationBatch, 
  TemperatureLog, 
  SugarReading, 
  FeedingRecord, 
  TastingNote,
  ImportPreview,
  AnomalySegment,
  SimilarBatchResult,
} from '../types';
import { parseCSVFile } from '../utils/csvParser';
import { matchAndCreateBatches, mergeBatches } from '../utils/batchMatcher';
import { findSimilarBatches, extractCurveFeatures } from '../utils/curveMatcher';
import { detectAllAnomalies, calculateRiskLevel } from '../utils/anomalyDetector';
import { generateSampleBatches } from '../data/sampleBatches';

interface BatchState {
  batches: FermentationBatch[];
  currentBatch: FermentationBatch | null;
  importPreview: ImportPreview;
  isLoading: boolean;
  error: string | null;
  
  importCSVFiles: (files: File[]) => Promise<void>;
  confirmImport: () => number;
  resetImportPreview: () => void;
  clearImportPreview: () => void;
  getBatch: (id: string) => FermentationBatch | undefined;
  setCurrentBatch: (batch: FermentationBatch | null) => void;
  updateBatch: (id: string, updates: Partial<FermentationBatch>) => void;
  addTastingNote: (batchId: string, note: Omit<TastingNote, 'id' | 'createdAt'>) => void;
  toggleAnomalyReviewed: (batchId: string, anomalyId: string) => void;
  markAnomalyReviewed: (batchId: string, anomalyId: string) => void;
  getSimilarBatches: (batchId: string, topK?: number) => SimilarBatchResult[];
  deleteBatch: (id: string) => void;
  loadSampleData: () => void;
  clearAllData: () => void;
  reanalyzeBatch: (batchId: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const initialPreview: ImportPreview = {
  temperatureLogs: [],
  sugarReadings: [],
  feedingRecords: [],
  badRows: [],
  previewBatches: [],
};

export const useBatchStore = create<BatchState>()(
  persist(
    (set, get) => ({
      batches: [],
      currentBatch: null,
      importPreview: initialPreview,
      isLoading: false,
      error: null,
      
      importCSVFiles: async (files: File[]) => {
        set({ isLoading: true, error: null });
        
        try {
          const allTempLogs: TemperatureLog[] = [];
          const allSugarReadings: SugarReading[] = [];
          const allFeedingRecords: FeedingRecord[] = [];
          const allBadRows = [];
          
          for (const file of files) {
            const result = await parseCSVFile(file);
            allBadRows.push(...result.badRows);
            
            if (result.fileType === 'temperature') {
              allTempLogs.push(...(result.data as TemperatureLog[]));
            } else if (result.fileType === 'sugar') {
              allSugarReadings.push(...(result.data as SugarReading[]));
            } else if (result.fileType === 'feeding') {
              allFeedingRecords.push(...(result.data as FeedingRecord[]));
            }
          }
          
          const badRowLogs = allBadRows.map(bad => {
            if (bad.type === 'temperature') {
              return {
                id: generateId(),
                timestamp: new Date(),
                temperature: 0,
                isBadRow: true,
                rawValue: bad.rawData,
              } as TemperatureLog;
            } else if (bad.type === 'sugar') {
              return {
                id: generateId(),
                timestamp: new Date(),
                brix: 0,
                originalUnit: 'Brix' as const,
                isBadRow: true,
                rawValue: bad.rawData,
              } as SugarReading;
            }
            return null;
          }).filter(Boolean) as (TemperatureLog | SugarReading)[];
          
          const previewBatches = matchAndCreateBatches(
            allTempLogs.filter(l => !l.isBadRow),
            allSugarReadings.filter(r => !r.isBadRow),
            allFeedingRecords
          );
          
          const preview: ImportPreview = {
            temperatureLogs: [...allTempLogs, ...badRowLogs.filter(r => 'temperature' in r) as TemperatureLog[]],
            sugarReadings: [...allSugarReadings, ...badRowLogs.filter(r => 'brix' in r) as SugarReading[]],
            feedingRecords: allFeedingRecords,
            badRows: allBadRows,
            previewBatches,
          };
          
          set({ importPreview: preview, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '导入失败', 
            isLoading: false 
          });
        }
      },
      
      confirmImport: () => {
        const { importPreview, batches } = get();
        
        const newBatches = matchAndCreateBatches(
          importPreview.temperatureLogs.filter(l => !l.isBadRow),
          importPreview.sugarReadings.filter(r => !r.isBadRow),
          importPreview.feedingRecords
        );
        
        const mergedBatches = mergeBatches(batches, newBatches);
        
        const badRowBatches = matchAndCreateBatches(
          importPreview.temperatureLogs.filter(l => l.isBadRow),
          importPreview.sugarReadings.filter(r => r.isBadRow),
          []
        );
        
        for (const badBatch of badRowBatches) {
          const existingIdx = mergedBatches.findIndex(
            b => b.tankNo === badBatch.tankNo && 
                 Math.abs(b.startTime.getTime() - badBatch.startTime.getTime()) < 86400000
          );
          
          if (existingIdx >= 0) {
            mergedBatches[existingIdx] = {
              ...mergedBatches[existingIdx],
              temperatureLogs: [
                ...mergedBatches[existingIdx].temperatureLogs,
                ...badBatch.temperatureLogs
              ],
              sugarReadings: [
                ...mergedBatches[existingIdx].sugarReadings,
                ...badBatch.sugarReadings
              ],
              badRows: importPreview.badRows,
            };
          }
        }
        
        set({ 
          batches: mergedBatches,
          importPreview: initialPreview,
        });
        
        return newBatches.length;
      },
      
      clearImportPreview: () => {
        set({ importPreview: initialPreview });
      },
      
      resetImportPreview: () => {
        set({ importPreview: initialPreview });
      },
      
      markAnomalyReviewed: (batchId: string, anomalyId: string) => {
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId 
              ? {
                  ...b,
                  anomalies: b.anomalies.map(a =>
                    a.id === anomalyId ? { ...a, reviewed: true } : a
                  ),
                } 
              : b
          ),
          currentBatch: state.currentBatch?.id === batchId 
            ? {
                ...state.currentBatch,
                anomalies: state.currentBatch.anomalies.map(a =>
                  a.id === anomalyId ? { ...a, reviewed: true } : a
                ),
              }
            : state.currentBatch,
        }));
      },
      
      getBatch: (id: string) => {
        return get().batches.find(b => b.id === id);
      },
      
      setCurrentBatch: (batch) => {
        set({ currentBatch: batch });
      },
      
      updateBatch: (id: string, updates: Partial<FermentationBatch>) => {
        set(state => ({
          batches: state.batches.map(b => 
            b.id === id ? { ...b, ...updates } : b
          ),
          currentBatch: state.currentBatch?.id === id 
            ? { ...state.currentBatch, ...updates } 
            : state.currentBatch,
        }));
      },
      
      addTastingNote: (batchId: string, note: Omit<TastingNote, 'id' | 'createdAt'>) => {
        const tastingNote: TastingNote = {
          ...note,
          id: generateId(),
          createdAt: new Date(),
        };
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId 
              ? { ...b, tastingNote, status: 'tasted' as const } 
              : b
          ),
          currentBatch: state.currentBatch?.id === batchId 
            ? { ...state.currentBatch, tastingNote, status: 'tasted' as const } 
            : state.currentBatch,
        }));
      },
      
      toggleAnomalyReviewed: (batchId: string, anomalyId: string) => {
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId 
              ? {
                  ...b,
                  anomalies: b.anomalies.map(a =>
                    a.id === anomalyId ? { ...a, reviewed: !a.reviewed } : a
                  ),
                } 
              : b
          ),
          currentBatch: state.currentBatch?.id === batchId 
            ? {
                ...state.currentBatch,
                anomalies: state.currentBatch.anomalies.map(a =>
                  a.id === anomalyId ? { ...a, reviewed: !a.reviewed } : a
                ),
              }
            : state.currentBatch,
        }));
      },
      
      getSimilarBatches: (batchId: string, topK: number = 5) => {
        const targetBatch = get().batches.find(b => b.id === batchId);
        if (!targetBatch) return [];
        return findSimilarBatches(targetBatch, get().batches, topK);
      },
      
      deleteBatch: (id: string) => {
        set(state => ({
          batches: state.batches.filter(b => b.id !== id),
          currentBatch: state.currentBatch?.id === id ? null : state.currentBatch,
        }));
      },
      
      loadSampleData: () => {
        const samples = generateSampleBatches();
        set({ batches: samples });
      },
      
      clearAllData: () => {
        set({ 
          batches: [], 
          currentBatch: null, 
          importPreview: initialPreview 
        });
      },
      
      reanalyzeBatch: (batchId: string) => {
        const batch = get().batches.find(b => b.id === batchId);
        if (!batch) return;
        
        const anomalies = detectAllAnomalies(
          batch.temperatureLogs,
          batch.sugarReadings,
          batch.feedingRecords
        );
        const riskLevel = calculateRiskLevel(anomalies);
        const curveFeatures = extractCurveFeatures(batch);
        
        set(state => ({
          batches: state.batches.map(b => 
            b.id === batchId 
              ? { ...b, anomalies, riskLevel, curveFeatures } 
              : b
          ),
          currentBatch: state.currentBatch?.id === batchId 
            ? { ...state.currentBatch, anomalies, riskLevel, curveFeatures } 
            : state.currentBatch,
        }));
      },
    }),
    {
      name: 'fermentation-batch-storage',
      partialize: (state) => ({
        batches: state.batches,
        currentBatch: state.currentBatch,
      }),
    }
  )
);
