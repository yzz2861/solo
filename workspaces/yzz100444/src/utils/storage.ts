import type { Project } from '@/types';

const STORAGE_KEY = 'open_question_projects';

export const saveProjects = (projects: Project[]): void => {
  try {
    const serialized = JSON.stringify(projects, (key, value) => {
      if (value instanceof Date) {
        return { __type__: 'Date', value: value.toISOString() };
      }
      return value;
    });
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save projects:', error);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return [];
    
    return JSON.parse(serialized, (key, value) => {
      if (value && typeof value === 'object' && value.__type__ === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
};

export const saveProject = (project: Project): void => {
  const projects = loadProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = { ...project, updatedAt: new Date() };
  } else {
    projects.push(project);
  }
  saveProjects(projects);
};

export const deleteProject = (projectId: string): void => {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
};

export const getProject = (projectId: string): Project | undefined => {
  const projects = loadProjects();
  return projects.find(p => p.id === projectId);
};
