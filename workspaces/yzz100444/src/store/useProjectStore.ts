import { create } from 'zustand';
import type { Project, ProjectSettings, Answer, Topic, ClusteringResult } from '@/types';
import { preprocessAnswer, markDuplicates, filterShortAnswers } from '@/utils/preprocess';
import { clusterAnswers } from '@/utils/clustering';
import { detectTopicRisks, sortTopicsByImportance } from '@/utils/riskDetection';
import { saveProject, loadProjects, deleteProject, getProject } from '@/utils/storage';
import { highRiskKeywords } from '@/data/riskKeywords';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isProcessing: boolean;
  processingProgress: number;
  error: string | null;
  
  createProject: (name: string) => Project;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  saveCurrentProject: () => void;
  setCurrentProject: (project: Project | null) => void;
  
  importAnswers: (texts: string[], options?: Partial<ProjectSettings>) => Promise<void>;
  runClustering: () => Promise<void>;
  
  updateTopicName: (topicId: string, name: string) => void;
  mergeTopics: (sourceTopicId: string, targetTopicId: string) => void;
  splitTopic: (topicId: string, answerIds: string[]) => void;
  moveAnswer: (answerId: string, targetTopicId: string) => void;
  
  toggleTopicPin: (topicId: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  
  loadProjectsFromStorage: () => void;
}

const defaultSettings: ProjectSettings = {
  clusteringSensitivity: 0.5,
  riskKeywords: highRiskKeywords,
  enableTypoCorrection: true,
  enableEmojiRemoval: true,
  minAnswerLength: 3,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isProcessing: false,
  processingProgress: 0,
  error: null,
  
  createProject: (name: string) => {
    const project: Project = {
      id: `project-${Date.now()}`,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      importCount: 0,
      duplicateCount: 0,
      cleanedCount: 0,
      answers: [],
      topics: [],
      settings: { ...defaultSettings },
      stats: {
        totalAnswers: 0,
        uniqueAnswers: 0,
        duplicateAnswers: 0,
        averageSentiment: 0,
      },
    };
    
    const projects = [...get().projects, project];
    set({ projects });
    saveProject(project);
    
    return project;
  },
  
  loadProject: (projectId: string) => {
    const project = getProject(projectId);
    if (project) {
      set({ currentProject: project });
    }
  },
  
  deleteProject: (projectId: string) => {
    deleteProject(projectId);
    const projects = get().projects.filter(p => p.id !== projectId);
    set({ projects });
    if (get().currentProject?.id === projectId) {
      set({ currentProject: null });
    }
  },
  
  saveCurrentProject: () => {
    const { currentProject } = get();
    if (currentProject) {
      saveProject(currentProject);
    }
  },
  
  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },
  
  importAnswers: async (texts: string[], options?: Partial<ProjectSettings>) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    set({ isProcessing: true, processingProgress: 0, error: null });
    
    try {
      const settings = { ...currentProject.settings, ...options };
      const projectId = currentProject.id;
      
      let answers: Answer[] = texts.map((text, index) => ({
        ...preprocessAnswer(text, settings, projectId, index),
        topicId: null,
        importanceScore: 0,
        matchedRiskKeywords: [],
        sentimentScore: 0,
      }));
      
      set({ processingProgress: 30 });
      
      answers = markDuplicates(answers);
      
      set({ processingProgress: 50 });
      
      answers = filterShortAnswers(answers, settings.minAnswerLength);
      
      set({ processingProgress: 70 });
      
      const importCount = texts.length;
      const duplicateCount = answers.filter(a => a.isDuplicate).length;
      const cleanedCount = answers.filter(a => !a.isDuplicate).length;
      const totalAnswers = answers.length;
      const uniqueAnswers = cleanedCount;
      const duplicateAnswers = duplicateCount;
      const averageSentiment = answers.length > 0
        ? answers.reduce((sum, a) => sum + a.sentiment, 0) / answers.length
        : 0;
      
      const updatedProject: Project = {
        ...currentProject,
        importCount,
        duplicateCount,
        cleanedCount,
        answers,
        topics: [],
        settings,
        updatedAt: new Date(),
        stats: {
          totalAnswers,
          uniqueAnswers,
          duplicateAnswers,
          averageSentiment,
        },
      };
      
      set({ currentProject: updatedProject, processingProgress: 100 });
      saveProject(updatedProject);
      
      setTimeout(() => set({ isProcessing: false, processingProgress: 0 }), 500);
    } catch (error) {
      set({ error: (error as Error).message, isProcessing: false, processingProgress: 0 });
    }
  },
  
  runClustering: async () => {
    const { currentProject } = get();
    if (!currentProject || currentProject.answers.length === 0) return;
    
    set({ isProcessing: true, processingProgress: 0, error: null });
    
    try {
      set({ processingProgress: 20 });
      
      const result: ClusteringResult = clusterAnswers(
        currentProject.answers,
        currentProject.settings,
        currentProject.id
      );
      
      set({ processingProgress: 50 });
      
      const { topics: topicsWithRisk, answers: answersWithRisk } = detectTopicRisks(
        result.topics,
        result.answers
      );
      
      set({ processingProgress: 75 });
      
      const sortedTopics = sortTopicsByImportance(topicsWithRisk);
      
      const riskTopics = sortedTopics.filter(t => t.isRisk).length;
      const riskAnswers = answersWithRisk.filter(a => a.matchedRiskKeywords.length > 0).length;
      
      result.stats.riskTopics = riskTopics;
      result.stats.riskAnswers = riskAnswers;
      
      const totalAnswers = answersWithRisk.length;
      const uniqueAnswers = answersWithRisk.filter(a => !a.isDuplicate).length;
      const duplicateAnswers = answersWithRisk.filter(a => a.isDuplicate).length;
      const averageSentiment = answersWithRisk.length > 0
        ? answersWithRisk.reduce((sum, a) => sum + a.sentiment, 0) / answersWithRisk.length
        : 0;
      
      const updatedProject: Project = {
        ...currentProject,
        answers: answersWithRisk,
        topics: sortedTopics,
        updatedAt: new Date(),
        stats: {
          totalAnswers,
          uniqueAnswers,
          duplicateAnswers,
          averageSentiment,
        },
      };
      
      set({ currentProject: updatedProject, processingProgress: 100 });
      saveProject(updatedProject);
      
      setTimeout(() => set({ isProcessing: false, processingProgress: 0 }), 500);
    } catch (error) {
      set({ error: (error as Error).message, isProcessing: false, processingProgress: 0 });
    }
  },
  
  updateTopicName: (topicId: string, name: string) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    const updatedTopics = currentProject.topics.map(topic => 
      topic.id === topicId 
        ? { ...topic, customName: name, updatedAt: new Date() }
        : topic
    );
    
    const updatedProject = {
      ...currentProject,
      topics: updatedTopics,
      updatedAt: new Date(),
    };
    
    set({ currentProject: updatedProject });
    saveProject(updatedProject);
  },
  
  mergeTopics: (sourceTopicId: string, targetTopicId: string) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    const sourceTopic = currentProject.topics.find(t => t.id === sourceTopicId);
    const targetTopic = currentProject.topics.find(t => t.id === targetTopicId);
    
    if (!sourceTopic || !targetTopic) return;
    
    const updatedAnswers = currentProject.answers.map(answer =>
      answer.topicId === sourceTopicId
        ? { ...answer, topicId: targetTopicId }
        : answer
    );
    
    const targetAnswers = updatedAnswers.filter(a => a.topicId === targetTopicId);
    
    const allKeywords = new Set([...sourceTopic.keywords, ...targetTopic.keywords]);
    
    const mergedTopic: Topic = {
      ...targetTopic,
      name: `${targetTopic.name} + ${sourceTopic.name}`,
      customName: undefined,
      answerCount: targetAnswers.length,
      percentage: (targetAnswers.length / currentProject.answers.length) * 100,
      keywords: Array.from(allKeywords).slice(0, 5),
      representativeAnswerIds: targetTopic.representativeAnswerIds.slice(0, 2).concat(
        sourceTopic.representativeAnswerIds.slice(0, 1)
      ),
      isPinned: sourceTopic.isPinned || targetTopic.isPinned,
      isRisk: sourceTopic.isRisk || targetTopic.isRisk,
      riskScore: Math.max(sourceTopic.riskScore, targetTopic.riskScore),
      riskReason: sourceTopic.riskReason || targetTopic.riskReason,
      sentimentScore: (sourceTopic.sentimentScore + targetTopic.sentimentScore) / 2,
      updatedAt: new Date(),
    };
    
    const updatedTopics = currentProject.topics
      .filter(t => t.id !== sourceTopicId)
      .map(t => t.id === targetTopicId ? mergedTopic : t);
    
    const sortedTopics = sortTopicsByImportance(updatedTopics);
    
    const updatedProject = {
      ...currentProject,
      answers: updatedAnswers,
      topics: sortedTopics,
      updatedAt: new Date(),
    };
    
    set({ currentProject: updatedProject });
    saveProject(updatedProject);
  },
  
  splitTopic: (topicId: string, answerIds: string[]) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    const sourceTopic = currentProject.topics.find(t => t.id === topicId);
    if (!sourceTopic) return;
    
    const newTopicId = `topic-${Date.now()}`;
    
    const updatedAnswers = currentProject.answers.map(answer =>
      answerIds.includes(answer.id)
        ? { ...answer, topicId: newTopicId }
        : answer
    );
    
    const newTopicAnswers = updatedAnswers.filter(a => a.topicId === newTopicId);
    const sourceTopicAnswers = updatedAnswers.filter(a => a.topicId === topicId);
    
    const newTopicKeywords = Array.from(new Set(
      newTopicAnswers.flatMap(a => a.cleanedText.split(/\s+/).filter(w => w.length >= 2))
    )).slice(0, 5);
    
    const newTopic: Topic = {
      id: newTopicId,
      projectId: currentProject.id,
      name: newTopicKeywords.slice(0, 3).join(' · ') || '新主题',
      answerCount: newTopicAnswers.length,
      percentage: (newTopicAnswers.length / currentProject.answers.length) * 100,
      keywords: newTopicKeywords,
      representativeAnswerIds: newTopicAnswers.slice(0, 3).map(a => a.id),
      isPinned: false,
      isRisk: newTopicAnswers.some(a => a.matchedRiskKeywords.length > 0),
      riskScore: Math.max(...newTopicAnswers.map(a => a.importanceScore), 0),
      riskReason: '',
      sentimentScore: newTopicAnswers.length > 0 
        ? newTopicAnswers.reduce((sum, a) => sum + a.sentimentScore, 0) / newTopicAnswers.length 
        : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedSourceTopic: Topic = {
      ...sourceTopic,
      answerCount: sourceTopicAnswers.length,
      percentage: (sourceTopicAnswers.length / currentProject.answers.length) * 100,
      updatedAt: new Date(),
    };
    
    const updatedTopics = currentProject.topics.map(t => 
      t.id === topicId ? updatedSourceTopic : t
    ).concat(newTopic);
    
    const sortedTopics = sortTopicsByImportance(updatedTopics);
    
    const updatedProject = {
      ...currentProject,
      answers: updatedAnswers,
      topics: sortedTopics,
      updatedAt: new Date(),
    };
    
    set({ currentProject: updatedProject });
    saveProject(updatedProject);
  },
  
  moveAnswer: (answerId: string, targetTopicId: string) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    const answer = currentProject.answers.find(a => a.id === answerId);
    if (!answer) return;
    
    const sourceTopicId = answer.topicId;
    
    const updatedAnswers = currentProject.answers.map(a =>
      a.id === answerId
        ? { ...a, topicId: targetTopicId }
        : a
    );
    
    let updatedTopics = currentProject.topics.map(topic => {
      const topicAnswers = updatedAnswers.filter(a => a.topicId === topic.id);
      return {
        ...topic,
        answerCount: topicAnswers.length,
        percentage: (topicAnswers.length / updatedAnswers.length) * 100,
        updatedAt: new Date(),
      };
    });
    
    if (sourceTopicId) {
      const sourceTopic = updatedTopics.find(t => t.id === sourceTopicId);
      if (sourceTopic && sourceTopic.answerCount === 0) {
        updatedTopics = updatedTopics.filter(t => t.id !== sourceTopicId);
      }
    }
    
    const sortedTopics = sortTopicsByImportance(updatedTopics);
    
    const updatedProject = {
      ...currentProject,
      answers: updatedAnswers,
      topics: sortedTopics,
      updatedAt: new Date(),
    };
    
    set({ currentProject: updatedProject });
    saveProject(updatedProject);
  },
  
  toggleTopicPin: (topicId: string) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    const updatedTopics = currentProject.topics.map(topic =>
      topic.id === topicId
        ? { ...topic, isPinned: !topic.isPinned, updatedAt: new Date() }
        : topic
    );
    
    const sortedTopics = sortTopicsByImportance(updatedTopics);
    
    const updatedProject = {
      ...currentProject,
      topics: sortedTopics,
      updatedAt: new Date(),
    };
    
    set({ currentProject: updatedProject });
    saveProject(updatedProject);
  },
  
  updateSettings: (settings: Partial<ProjectSettings>) => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      settings: { ...currentProject.settings, ...settings },
      updatedAt: new Date(),
    };
    
    set({ currentProject: updatedProject });
    saveProject(updatedProject);
  },
  
  loadProjectsFromStorage: () => {
    const projects = loadProjects();
    set({ projects });
  },
}));
