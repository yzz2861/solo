import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ArchiveProject, 
  ArchiveRecord, 
  InspectionTask, 
  InspectionItem,
  QualityReport
} from '@/types';
import { createProject, updateProjectStats } from '@/services/import';
import { detectMissingPages, detectSameNames } from '@/services/extractor';
import { generateInspectionTask } from '@/services/inspection';

interface ArchiveState {
  projects: ArchiveProject[];
  currentProjectId: string | null;
  records: ArchiveRecord[];
  inspectionTasks: InspectionTask[];
  currentTaskId: string | null;
  selectedRecordId: string | null;
  filterOptions: {
    status: string;
    confidence: string;
    field: string;
    materialType: string;
    search: string;
  };
  addProject: (name: string, description?: string) => ArchiveProject;
  setCurrentProject: (projectId: string | null) => void;
  addRecords: (projectId: string, records: ArchiveRecord[]) => void;
  updateRecordField: (recordId: string, fieldId: string, correctedValue: string) => void;
  updateRecordStatus: (recordId: string, status: ArchiveRecord['status']) => void;
  updateRecordNotes: (recordId: string, notes: string) => void;
  deleteProject: (projectId: string) => void;
  deleteRecord: (recordId: string) => void;
  runQualityCheck: (projectId: string) => QualityReport;
  setFilter: (key: keyof ArchiveState['filterOptions'], value: string) => void;
  setSelectedRecord: (recordId: string | null) => void;
  createInspectionTask: (projectId: string, name: string, config: Parameters<typeof generateInspectionTask>[3]) => InspectionTask & { items: InspectionItem[] };
  updateInspectionItem: (taskId: string, itemId: string, updates: Partial<InspectionItem>) => void;
  setCurrentTask: (taskId: string | null) => void;
  getCurrentProject: () => ArchiveProject | null;
  getCurrentRecords: () => ArchiveRecord[];
  getFilteredRecords: () => ArchiveRecord[];
  getCurrentTask: () => InspectionTask | null;
  getCurrentTaskItems: () => InspectionItem[];
  getRecordById: (recordId: string) => ArchiveRecord | null;
  clearAll: () => void;
}

const initialFilterOptions = {
  status: 'all',
  confidence: 'all',
  field: 'all',
  materialType: 'all',
  search: ''
};

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      records: [],
      inspectionTasks: [],
      currentTaskId: null,
      selectedRecordId: null,
      filterOptions: initialFilterOptions,
      
      addProject: (name, description) => {
        const project = createProject(name, description);
        set(state => ({
          projects: [...state.projects, project],
          currentProjectId: project.id
        }));
        return project;
      },
      
      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId, selectedRecordId: null });
      },
      
      addRecords: (projectId, records) => {
        set(state => {
          const existingRecords = state.records.filter(r => r.projectId !== projectId);
          const allRecords = [...existingRecords, ...records];
          
          const missingPages = detectMissingPages(allRecords.filter(r => r.projectId === projectId));
          const sameNames = detectSameNames(allRecords.filter(r => r.projectId === projectId));
          
          const updatedRecords = allRecords.map(record => {
            if (record.projectId !== projectId) return record;
            
            const hasMissingPage = missingPages.some(mp => mp.recordId === record.id);
            const sameNameEntry = sameNames.find(sn => sn.recordIds.includes(record.id));
            
            return {
              ...record,
              hasMissingPage,
              missingPageReason: hasMissingPage ? missingPages.find(mp => mp.recordId === record.id)?.reason : undefined,
              hasSameNameWarning: !!sameNameEntry,
              sameNameRecordIds: sameNameEntry?.recordIds
            };
          });
          
          const project = state.projects.find(p => p.id === projectId);
          const updatedProject = project ? updateProjectStats(project, updatedRecords.filter(r => r.projectId === projectId)) : null;
          
          return {
            records: updatedRecords,
            projects: updatedProject 
              ? state.projects.map(p => p.id === projectId ? updatedProject : p)
              : state.projects
          };
        });
      },
      
      updateRecordField: (recordId, fieldId, correctedValue) => {
        set(state => {
          const updatedRecords = state.records.map(record => {
            if (record.id !== recordId) return record;
            
            const updatedFields = record.fields.map(field => {
              if (field.id !== fieldId) return field;
              return {
                ...field,
                correctedValue,
                isLowConfidence: false,
                source: 'manual' as const
              };
            });
            
            const overallConfidence = updatedFields.reduce((sum, f) => sum + f.confidence, 0) / updatedFields.length;
            
            return {
              ...record,
              fields: updatedFields,
              overallConfidence,
              status: 'corrected' as const,
              updatedAt: Date.now()
            };
          });
          
          return { records: updatedRecords };
        });
      },
      
      updateRecordStatus: (recordId, status) => {
        set(state => ({
          records: state.records.map(record =>
            record.id === recordId
              ? { ...record, status, updatedAt: Date.now() }
              : record
          )
        }));
      },
      
      updateRecordNotes: (recordId, notes) => {
        set(state => ({
          records: state.records.map(record =>
            record.id === recordId
              ? { ...record, reviewNotes: notes, updatedAt: Date.now() }
              : record
          )
        }));
      },
      
      deleteProject: (projectId) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          records: state.records.filter(r => r.projectId !== projectId),
          inspectionTasks: state.inspectionTasks.filter(t => t.projectId !== projectId),
          currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
          selectedRecordId: null
        }));
      },
      
      deleteRecord: (recordId) => {
        set(state => {
          const record = state.records.find(r => r.id === recordId);
          const projectId = record?.projectId;
          
          const updatedRecords = state.records.filter(r => r.id !== recordId);
          
          if (projectId) {
            const project = state.projects.find(p => p.id === projectId);
            const projectRecords = updatedRecords.filter(r => r.projectId === projectId);
            const updatedProject = project ? updateProjectStats(project, projectRecords) : null;
            
            return {
              records: updatedRecords,
              projects: updatedProject
                ? state.projects.map(p => p.id === projectId ? updatedProject : p)
                : state.projects,
              selectedRecordId: state.selectedRecordId === recordId ? null : state.selectedRecordId
            };
          }
          
          return {
            records: updatedRecords,
            selectedRecordId: state.selectedRecordId === recordId ? null : state.selectedRecordId
          };
        });
      },
      
      runQualityCheck: (projectId) => {
        const projectRecords = get().records.filter(r => r.projectId === projectId);
        
        const report: QualityReport = {
          projectId,
          totalRecords: projectRecords.length,
          lowConfidenceRecords: projectRecords.filter(r => r.fields.some(f => f.isLowConfidence)).length,
          lowConfidenceByField: {
            name: 0,
            date: 0,
            documentNumber: 0,
            pageNumber: 0,
            materialType: 0
          },
          averageConfidenceByField: {
            name: 0,
            date: 0,
            documentNumber: 0,
            pageNumber: 0,
            materialType: 0
          },
          missingPageRecords: projectRecords.filter(r => r.hasMissingPage).length,
          sameNameRecords: projectRecords.filter(r => r.hasSameNameWarning).length,
          correctedCount: projectRecords.filter(r => r.status === 'corrected' || r.status === 'approved').length,
          correctionRate: 0
        };
        
        const fieldCounts: Record<string, number> = {
          name: 0,
          date: 0,
          documentNumber: 0,
          pageNumber: 0,
          materialType: 0
        };
        
        for (const record of projectRecords) {
          for (const field of record.fields) {
            if (field.isLowConfidence) {
              report.lowConfidenceByField[field.fieldName]++;
            }
            report.averageConfidenceByField[field.fieldName] += field.confidence;
            fieldCounts[field.fieldName]++;
          }
        }
        
        for (const fieldName of Object.keys(report.averageConfidenceByField) as (keyof typeof report.averageConfidenceByField)[]) {
          if (fieldCounts[fieldName] > 0) {
            report.averageConfidenceByField[fieldName] /= fieldCounts[fieldName];
          }
        }
        
        report.correctionRate = projectRecords.length > 0
          ? report.correctedCount / projectRecords.length
          : 0;
        
        return report;
      },
      
      setFilter: (key, value) => {
        set(state => ({
          filterOptions: { ...state.filterOptions, [key]: value }
        }));
      },
      
      setSelectedRecord: (recordId) => {
        set({ selectedRecordId: recordId });
      },
      
      createInspectionTask: (projectId, name, config) => {
        const projectRecords = get().records.filter(r => r.projectId === projectId);
        const task = generateInspectionTask(projectId, projectRecords, name, config);
        
        set(state => ({
          inspectionTasks: [...state.inspectionTasks, task],
          currentTaskId: task.id
        }));
        
        return task;
      },
      
      updateInspectionItem: (taskId, itemId, updates) => {
        set(state => ({
          inspectionTasks: state.inspectionTasks.map(task => {
            if (task.id !== taskId) return task;
            
            const items = (task as InspectionTask & { items: InspectionItem[] }).items.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            );
            
            const completedCount = items.filter(i => i.status !== 'pending').length;
            
            return {
              ...task,
              items,
              completedCount,
              status: completedCount === items.length ? 'completed' : 'in_progress',
              completedAt: completedCount === items.length ? Date.now() : undefined
            } as InspectionTask & { items: InspectionItem[] };
          })
        }));
      },
      
      setCurrentTask: (taskId) => {
        set({ currentTaskId: taskId });
      },
      
      getCurrentProject: () => {
        const { currentProjectId, projects } = get();
        return projects.find(p => p.id === currentProjectId) || null;
      },
      
      getCurrentRecords: () => {
        const { currentProjectId, records } = get();
        return records.filter(r => r.projectId === currentProjectId);
      },
      
      getFilteredRecords: () => {
        const records = get().getCurrentRecords();
        const { filterOptions } = get();
        
        let filtered = [...records];
        
        if (filterOptions.status !== 'all') {
          filtered = filtered.filter(r => r.status === filterOptions.status);
        }
        
        if (filterOptions.confidence === 'low') {
          filtered = filtered.filter(r => r.overallConfidence < 0.6);
        } else if (filterOptions.confidence === 'medium') {
          filtered = filtered.filter(r => r.overallConfidence >= 0.6 && r.overallConfidence < 0.8);
        } else if (filterOptions.confidence === 'high') {
          filtered = filtered.filter(r => r.overallConfidence >= 0.8);
        }
        
        if (filterOptions.field !== 'all') {
          filtered = filtered.filter(r => 
            r.fields.some(f => f.fieldName === filterOptions.field && f.isLowConfidence)
          );
        }
        
        if (filterOptions.materialType !== 'all') {
          filtered = filtered.filter(r => {
            const typeField = r.fields.find(f => f.fieldName === 'materialType');
            return typeField?.ocrValue === filterOptions.materialType;
          });
        }
        
        if (filterOptions.search) {
          const searchLower = filterOptions.search.toLowerCase();
          filtered = filtered.filter(r =>
            r.ocrText.toLowerCase().includes(searchLower) ||
            r.fields.some(f => 
              (f.ocrValue || '').toLowerCase().includes(searchLower) ||
              (f.correctedValue || '').toLowerCase().includes(searchLower)
            )
          );
        }
        
        return filtered;
      },
      
      getCurrentTask: () => {
        const { currentTaskId, inspectionTasks } = get();
        return inspectionTasks.find(t => t.id === currentTaskId) || null;
      },
      
      getCurrentTaskItems: () => {
        const task = get().getCurrentTask() as InspectionTask & { items: InspectionItem[] } | null;
        return task?.items || [];
      },
      
      getRecordById: (recordId) => {
        return get().records.find(r => r.id === recordId) || null;
      },
      
      clearAll: () => {
        set({
          projects: [],
          currentProjectId: null,
          records: [],
          inspectionTasks: [],
          currentTaskId: null,
          selectedRecordId: null,
          filterOptions: initialFilterOptions
        });
      }
    }),
    {
      name: 'archive-proofreader-storage',
      partialize: (state) => ({
        projects: state.projects,
        records: state.records,
        inspectionTasks: state.inspectionTasks
      })
    }
  )
);

export default useArchiveStore;
