import type { TrainingCase, TrainingRecord, Student, CurrentUser, LevelAccuracy } from '../types';
import { mockCases, mockStudents } from '../data/mockData';

const STORAGE_KEYS = {
  CASES: 'triage_cases',
  RECORDS: 'triage_records',
  STUDENTS: 'triage_students',
  CURRENT_USER: 'triage_current_user',
};

export function getCases(): TrainingCase[] {
  const stored = localStorage.getItem(STORAGE_KEYS.CASES);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(mockCases));
  return mockCases;
}

export function saveCases(cases: TrainingCase[]): void {
  localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
}

export function getCaseById(id: string): TrainingCase | undefined {
  const cases = getCases();
  return cases.find(c => c.id === id);
}

export function upsertCase(caseData: TrainingCase): void {
  const cases = getCases();
  const index = cases.findIndex(c => c.id === caseData.id);
  if (index >= 0) {
    cases[index] = { ...caseData, updatedAt: Date.now() };
  } else {
    cases.push({ ...caseData, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveCases(cases);
}

export function deleteCase(id: string): void {
  const cases = getCases();
  const filtered = cases.filter(c => c.id !== id);
  saveCases(filtered);
}

export function getRecords(): TrainingRecord[] {
  const stored = localStorage.getItem(STORAGE_KEYS.RECORDS);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

export function saveRecord(record: TrainingRecord): void {
  const records = getRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  
  updateStudentStats(record.studentName, record.score);
}

export function getRecordById(id: string): TrainingRecord | undefined {
  const records = getRecords();
  return records.find(r => r.id === id);
}

export function getRecordsByStudent(studentName: string): TrainingRecord[] {
  const records = getRecords();
  return records.filter(r => r.studentName === studentName)
    .sort((a, b) => b.endTime - a.endTime);
}

export function getStudents(): Student[] {
  const stored = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(mockStudents));
  return mockStudents;
}

export function saveStudents(students: Student[]): void {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function updateStudentStats(studentName: string, lastScore: number): void {
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.name === studentName);
  
  if (studentIndex >= 0) {
    const student = students[studentIndex];
    const newCount = student.trainingCount + 1;
    const newAvg = (student.averageScore * student.trainingCount + lastScore) / newCount;
    students[studentIndex] = {
      ...student,
      trainingCount: newCount,
      averageScore: Math.round(newAvg * 10) / 10,
      lastTrainingTime: Date.now(),
    };
  } else {
    students.push({
      id: `stu-${Date.now()}`,
      name: studentName,
      trainingCount: 1,
      averageScore: lastScore,
      lastTrainingTime: Date.now(),
    });
  }
  saveStudents(students);
}

export function getCurrentUser(): CurrentUser | null {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
}

export function setCurrentUser(user: CurrentUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
