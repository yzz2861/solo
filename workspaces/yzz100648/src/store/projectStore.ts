import { create } from 'zustand';
import { db } from '@/db';
import type { Project, TeamMember, MemberRole } from '@/types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  teamMembers: TeamMember[];
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  loadTeamMembers: (projectId: string) => Promise<void>;
  addTeamMember: (projectId: string, name: string, role: MemberRole) => Promise<TeamMember>;
  removeTeamMember: (id: string) => Promise<void>;
  updateProjectCounts: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  teamMembers: [],

  loadProjects: async () => {
    const projects = await db.projects.orderBy('createdAt').reverse().toArray();
    set({ projects });
  },

  createProject: async (name: string) => {
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      createdAt: Date.now(),
      responseCount: 0,
      riskCount: 0,
    };
    await db.projects.add(project);

    const defaultMembers: Omit<TeamMember, 'id'>[] = [
      { projectId: project.id, name: '张研究员', role: 'researcher' },
      { projectId: project.id, name: '李产品', role: 'pm' },
      { projectId: project.id, name: '王合规', role: 'compliance' },
    ];
    for (const m of defaultMembers) {
      await db.teamMembers.add({
        ...m,
        id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      });
    }

    await get().loadProjects();
    return project;
  },

  deleteProject: async (id: string) => {
    await db.responses.where('projectId').equals(id).delete();
    await db.risks.where('projectId').equals(id).delete();
    await db.teamMembers.where('projectId').equals(id).delete();
    await db.projects.delete(id);
    await get().loadProjects();
    if (get().currentProject?.id === id) {
      set({ currentProject: null });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  loadTeamMembers: async (projectId: string) => {
    const teamMembers = await db.teamMembers.where('projectId').equals(projectId).toArray();
    set({ teamMembers });
  },

  addTeamMember: async (projectId: string, name: string, role: MemberRole) => {
    const member: TeamMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      projectId,
      name,
      role,
    };
    await db.teamMembers.add(member);
    await get().loadTeamMembers(projectId);
    return member;
  },

  removeTeamMember: async (id: string) => {
    await db.teamMembers.delete(id);
    const currentProject = get().currentProject;
    if (currentProject) {
      await get().loadTeamMembers(currentProject.id);
    }
  },

  updateProjectCounts: async (projectId: string) => {
    const responseCount = await db.responses.where('projectId').equals(projectId).count();
    const riskCount = await db.risks.where('projectId').equals(projectId).count();
    await db.projects.update(projectId, { responseCount, riskCount });
    await get().loadProjects();
    const current = get().currentProject;
    if (current?.id === projectId) {
      set({ currentProject: { ...current, responseCount, riskCount } });
    }
  },
}));
