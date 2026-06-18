import { create } from 'zustand';
import type { Student } from '@/types';
import { loadStudents, saveStudents } from '@/utils/storage';

interface StudentState {
  students: Student[];
  initFromStorage: () => void;
  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  getStudentById: (id: string) => Student | undefined;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],

  initFromStorage: () => {
    const loaded = loadStudents();
    set({ students: loaded });
  },

  addStudent: (studentData) => {
    const now = new Date().toISOString();
    const newStudent: Student = {
      ...studentData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const students = [...get().students, newStudent];
    set({ students });
    saveStudents(students);
  },

  updateStudent: (id, updates) => {
    const students = get().students.map((s) =>
      s.id === id
        ? {
            ...s,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    set({ students });
    saveStudents(students);
  },

  deleteStudent: (id) => {
    const students = get().students.filter((s) => s.id !== id);
    set({ students });
    saveStudents(students);
  },

  getStudentById: (id) => {
    return get().students.find((s) => s.id === id);
  },
}));
