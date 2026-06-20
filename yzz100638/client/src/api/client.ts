import axios from 'axios';
import type {
  Case,
  CompletionResult,
  ExportData,
  User,
  Stats,
  LeaderboardItem,
  TrainingCase,
} from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const caseApi = {
  complete: (data: {
    shortDescription: string;
    photoNotes: string[];
    context?: any;
  }) => apiClient.post<CompletionResult>('/cases/complete', data),

  create: (data: {
    surveyorId: string;
    plateNumber: string;
    originalDescription: string;
    photoNotes: string[];
    context?: any;
  }) => apiClient.post<Case>('/cases', data),

  list: (params?: { surveyorId?: string; status?: string }) =>
    apiClient.get<Case[]>('/cases', { params }),

  get: (id: string) => apiClient.get<Case>(`/cases/${id}`),

  update: (id: string, data: Partial<Case>) =>
    apiClient.put<Case>(`/cases/${id}`, data),

  confirm: (id: string, data: {
    confirmedParts: { id: string; name: string; damage: string }[];
    confirmedLiability: string;
    notes?: string;
  }) => apiClient.post<Case>(`/cases/${id}/confirm`, data),

  export: (id: string) =>
    apiClient.post<ExportData>(`/cases/${id}/export`),

  updateReshoot: (caseId: string, reshootId: string, data: {
    photoUrl?: string;
    notes?: string;
    isCompleted: boolean;
  }) => apiClient.post<Case>(`/cases/${caseId}/reshoot/${reshootId}`, data),
};

export const leaderApi = {
  getLowConfidenceCases: (params?: { limit?: number; skip?: number }) =>
    apiClient.get<Case[]>('/leader/low-confidence-cases', { params }),

  getStats: () => apiClient.get<Stats>('/leader/stats'),

  getLeaderboard: () => apiClient.get<LeaderboardItem[]>('/leader/leaderboard'),

  getTrainingCases: (params?: { limit?: number; skip?: number }) =>
    apiClient.get<TrainingCase[]>('/leader/training-cases', { params }),

  getTrainingCase: (id: string) =>
    apiClient.get<TrainingCase>(`/leader/training-cases/${id}`),

  createTrainingCase: (data: {
    sourceCaseId?: string;
    sourcePlateNumber?: string;
    example?: { bad: string; good: string; explanation: string };
    improvements: string[];
    trainerNotes?: string;
    confidenceImprovement?: number;
    category?: string;
    createdBy: string;
  }) => apiClient.post<TrainingCase>('/leader/training-cases', data),

  convertToTraining: (caseId: string, data: {
    improvements: string[];
    example?: { bad: string; good: string; explanation: string };
    trainerNotes: string;
    createdBy: string;
  }) => apiClient.post<TrainingCase>(`/leader/case/${caseId}/convert-to-training`, data),

  markTrainingComplete: (id: string, data: {
    learnerId: string;
    learnerNotes?: string;
    quizScore?: number;
  }) => apiClient.post<TrainingCase>(`/leader/training-cases/${id}/complete`, data),

  deleteTrainingCase: (id: string) =>
    apiClient.delete(`/leader/training-cases/${id}`),
};

export const authApi = {
  login: (username: string) =>
    apiClient.post<{ user: User; token: string }>('/auth/login', { username }),
};

export default apiClient;
