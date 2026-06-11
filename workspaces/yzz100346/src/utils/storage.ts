import type { Project, HistoryEntry, ProjectSummary } from '../types/project';
import { createProjectSummary } from '../types/project';
import { SAFETY_THRESHOLDS } from '../constants/safetyThresholds';

const PROJECTS_KEY = 'stage_safety_projects';
const HISTORY_KEY = 'stage_safety_history';
const CURRENT_PROJECT_KEY = 'stage_safety_current_project';

export const saveProject = (project: Project): void => {
  try {
    const projects = getAllProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...project, updatedAt: Date.now() };
    } else {
      projects.push(project);
    }
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    setCurrentProjectId(project.id);
  } catch (error) {
    console.error('Failed to save project:', error);
  }
};

export const loadProject = (projectId: string): Project | null => {
  try {
    const projects = getAllProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
    }
    return project || null;
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
};

export const deleteProject = (projectId: string): void => {
  try {
    const projects = getAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
    
    clearHistoryForProject(projectId);
    
    const currentId = getCurrentProjectId();
    if (currentId === projectId) {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
};

export const getAllProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get all projects:', error);
    return [];
  }
};

export const getAllProjectSummaries = (): ProjectSummary[] => {
  const projects = getAllProjects();
  return projects.map(createProjectSummary);
};

export const setCurrentProjectId = (projectId: string): void => {
  localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
};

export const getCurrentProjectId = (): string | null => {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
};

export const saveHistoryEntry = (entry: HistoryEntry): void => {
  try {
    const history = getHistoryForProject(entry.projectId);
    history.unshift(entry);
    
    if (history.length > SAFETY_THRESHOLDS.MAX_HISTORY_ENTRIES) {
      history.length = SAFETY_THRESHOLDS.MAX_HISTORY_ENTRIES;
    }
    
    const allHistory = getAllHistory();
    allHistory.set(entry.projectId, history);
    
    const serialized = Array.from(allHistory.entries());
    localStorage.setItem(HISTORY_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save history entry:', error);
  }
};

export const getHistoryForProject = (projectId: string): HistoryEntry[] => {
  try {
    const allHistory = getAllHistory();
    return allHistory.get(projectId) || [];
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
};

export const clearHistoryForProject = (projectId: string): void => {
  try {
    const allHistory = getAllHistory();
    allHistory.delete(projectId);
    const serialized = Array.from(allHistory.entries());
    localStorage.setItem(HISTORY_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

const getAllHistory = (): Map<string, HistoryEntry[]> => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (data) {
      const entries: [string, HistoryEntry[]][] = JSON.parse(data);
      return new Map(entries);
    }
    return new Map();
  } catch (error) {
    console.error('Failed to parse history:', error);
    return new Map();
  }
};

export const exportProjectToJSON = (project: Project): string => {
  return JSON.stringify(project, null, 2);
};

export const importProjectFromJSON = (jsonString: string): Project | null => {
  try {
    const project = JSON.parse(jsonString) as Project;
    if (project.id && project.name && Array.isArray(project.devices)) {
      return project;
    }
    return null;
  } catch (error) {
    console.error('Failed to import project:', error);
    return null;
  }
};
