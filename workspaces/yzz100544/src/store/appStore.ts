import { create } from 'zustand';
import type { Feedback, Theme, FeedbackThemeRelation, Improvement, Course, FeedbackSource, SeverityLevel, PriorityLevel, ImprovementStatus, ThemeWithStats, ParsedLine } from '@/types';
import { db } from '@/db';
import { DEFAULT_THEMES, buildThemeRelations, determineSeverity, multiLabelClassify, generateId } from '@/utils/clustering';
import { parsedLinesToFeedback } from '@/utils/io';
import { generateMockData } from '@/utils/mockData';

interface AppState {
  feedback: Feedback[];
  themes: Theme[];
  feedbackThemes: FeedbackThemeRelation[];
  improvements: Improvement[];
  courses: Course[];
  isLoaded: boolean;
  isInitialized: boolean;

  loadAll: () => Promise<void>;
  initializeWithMock: () => Promise<void>;
  resetAll: () => Promise<void>;

  addFeedback: (fb: Feedback) => Promise<void>;
  batchAddFeedback: (items: ParsedLine[], defaultHomework?: string) => Promise<{ total: number }>;
  updateFeedback: (id: string, patch: Partial<Feedback>) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;

  addTheme: (theme: Omit<Theme, 'id' | 'isCustom'>) => Promise<void>;
  updateTheme: (id: string, patch: Partial<Theme>) => Promise<void>;
  deleteTheme: (id: string) => Promise<void>;
  mergeThemes: (sourceIds: string[], targetId: string, newName?: string) => Promise<void>;

  setFeedbackThemes: (feedbackId: string, themeIds: string[]) => Promise<void>;
  addFeedbackThemeRelation: (rel: FeedbackThemeRelation) => Promise<void>;
  removeFeedbackThemeRelation: (feedbackId: string, themeId: string) => Promise<void>;
  runClustering: (feedbackIds?: string[]) => Promise<void>;

  addImprovement: (imp: Omit<Improvement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateImprovement: (id: string, patch: Partial<Improvement>) => Promise<void>;
  deleteImprovement: (id: string) => Promise<void>;
  setImprovementStatus: (id: string, status: ImprovementStatus) => Promise<void>;

  addCourse: (course: Omit<Course, 'id'>) => Promise<void>;
  updateCourse: (id: string, patch: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  assignImprovementToCourse: (improvementId: string, courseId: string | undefined) => Promise<void>;

  getThemeStats: () => ThemeWithStats[];
  getFeedbackByTheme: (themeId: string) => Feedback[];
  getThemesForFeedback: (feedbackId: string) => Theme[];
  getImprovementsByCourse: (courseId?: string) => Improvement[];
  filterFeedback: (opts: { source?: FeedbackSource[]; severity?: SeverityLevel[]; homework?: string; keyword?: string }) => Feedback[];
}

export const useAppStore = create<AppState>((set, get) => ({
  feedback: [],
  themes: [],
  feedbackThemes: [],
  improvements: [],
  courses: [],
  isLoaded: false,
  isInitialized: false,

  loadAll: async () => {
    const [feedback, themes, feedbackThemes, improvements, courses] = await Promise.all([
      db.feedback.toArray(),
      db.themes.toArray(),
      db.feedbackThemes.toArray(),
      db.improvements.toArray(),
      db.courses.toArray(),
    ]);
    set({ feedback, themes, feedbackThemes, improvements, courses, isLoaded: true });
  },

  initializeWithMock: async () => {
    const { feedback, themes, feedbackThemes, improvements, courses } = generateMockData();
    await db.transaction('rw', db.feedback, db.themes, db.feedbackThemes, db.improvements, db.courses, async () => {
      await Promise.all([
        db.feedback.clear(), db.themes.clear(), db.feedbackThemes.clear(),
        db.improvements.clear(), db.courses.clear(),
      ]);
      await db.themes.bulkAdd(themes);
      await db.feedback.bulkAdd(feedback);
      await db.feedbackThemes.bulkAdd(feedbackThemes);
      await db.improvements.bulkAdd(improvements);
      await db.courses.bulkAdd(courses);
    });
    set({ feedback, themes, feedbackThemes, improvements, courses, isLoaded: true, isInitialized: true });
  },

  resetAll: async () => {
    await db.transaction('rw', db.feedback, db.themes, db.feedbackThemes, db.improvements, db.courses, async () => {
      await Promise.all([
        db.feedback.clear(), db.themes.clear(), db.feedbackThemes.clear(),
        db.improvements.clear(), db.courses.clear(),
      ]);
    });
    set({ feedback: [], themes: [], feedbackThemes: [], improvements: [], courses: [], isInitialized: false });
  },

  addFeedback: async (fb) => {
    await db.feedback.add(fb);
    const rels = buildThemeRelations(fb, get().themes);
    if (rels.length > 0) await db.feedbackThemes.bulkAdd(rels);
    set(s => ({ feedback: [...s.feedback, fb], feedbackThemes: [...s.feedbackThemes, ...rels] }));
  },

  batchAddFeedback: async (items, defaultHomework) => {
    const feedbacks = parsedLinesToFeedback(items, defaultHomework);
    const allRels: FeedbackThemeRelation[] = [];
    for (const fb of feedbacks) {
      allRels.push(...buildThemeRelations(fb, get().themes));
    }
    await db.transaction('rw', db.feedback, db.feedbackThemes, async () => {
      await db.feedback.bulkAdd(feedbacks);
      if (allRels.length > 0) await db.feedbackThemes.bulkAdd(allRels);
    });
    set(s => ({ feedback: [...s.feedback, ...feedbacks], feedbackThemes: [...s.feedbackThemes, ...allRels] }));
    return { total: feedbacks.length };
  },

  updateFeedback: async (id, patch) => {
    await db.feedback.update(id, patch);
    set(s => ({ feedback: s.feedback.map(f => f.id === id ? { ...f, ...patch } : f) }));
  },

  deleteFeedback: async (id) => {
    await db.transaction('rw', db.feedback, db.feedbackThemes, async () => {
      await db.feedback.delete(id);
      await db.feedbackThemes.where('feedbackId').equals(id).delete();
    });
    set(s => ({
      feedback: s.feedback.filter(f => f.id !== id),
      feedbackThemes: s.feedbackThemes.filter(r => r.feedbackId !== id),
    }));
  },

  addTheme: async (theme) => {
    const t: Theme = { ...theme, id: generateId('theme'), isCustom: true };
    await db.themes.add(t);
    set(s => ({ themes: [...s.themes, t] }));
  },

  updateTheme: async (id, patch) => {
    await db.themes.update(id, patch);
    set(s => ({ themes: s.themes.map(t => t.id === id ? { ...t, ...patch } : t) }));
  },

  deleteTheme: async (id) => {
    await db.transaction('rw', db.themes, db.feedbackThemes, async () => {
      await db.themes.delete(id);
      await db.feedbackThemes.where('themeId').equals(id).delete();
    });
    set(s => ({
      themes: s.themes.filter(t => t.id !== id),
      feedbackThemes: s.feedbackThemes.filter(r => r.themeId !== id),
    }));
  },

  mergeThemes: async (sourceIds, targetId, newName) => {
    const { feedbackThemes } = get();
    const toUpdate: Array<[string, string]> = [];
    for (const sid of sourceIds) {
      const rels = feedbackThemes.filter(r => r.themeId === sid);
      for (const r of rels) {
        const exists = feedbackThemes.some(x => x.themeId === targetId && x.feedbackId === r.feedbackId);
        if (!exists) toUpdate.push([r.feedbackId, sid]);
      }
    }
    await db.transaction('rw', db.themes, db.feedbackThemes, async () => {
      for (const [fid, oldTid] of toUpdate) {
        await db.feedbackThemes.delete([fid, oldTid]);
        await db.feedbackThemes.add({ feedbackId: fid, themeId: targetId, matchScore: 0.8, matchedKeywords: [], manuallyAdjusted: true });
      }
      for (const sid of sourceIds) {
        await db.themes.delete(sid);
      }
      if (newName) await db.themes.update(targetId, { name: newName });
    });
    await get().loadAll();
  },

  setFeedbackThemes: async (feedbackId, themeIds) => {
    const { themes, feedback } = get();
    const fb = feedback.find(f => f.id === feedbackId);
    const newRels: FeedbackThemeRelation[] = themeIds.map(tid => ({
      feedbackId,
      themeId: tid,
      matchScore: 1,
      matchedKeywords: [],
      manuallyAdjusted: true,
    }));
    if (fb) {
      const classifyResults = themeIds.map(themeId => ({ themeId, score: 1, matchedKeywords: [] as string[] }));
      const themeCounts = new Map<string, number>();
      const { severity, isSevere } = determineSeverity(fb.content, classifyResults, themeCounts);
      await db.feedback.update(feedbackId, { severity, isSevere });
    }
    await db.transaction('rw', db.feedbackThemes, async () => {
      await db.feedbackThemes.where('feedbackId').equals(feedbackId).delete();
      if (newRels.length > 0) await db.feedbackThemes.bulkAdd(newRels);
    });
    set(s => {
      const filtered = s.feedbackThemes.filter(r => r.feedbackId !== feedbackId);
      const updatedFb = s.feedback.map(f => f.id === feedbackId ? { ...f, ...(fb ? { severity: fb.severity, isSevere: fb.isSevere } : {}) } : f);
      return { feedbackThemes: [...filtered, ...newRels], feedback: updatedFb };
    });
  },

  addFeedbackThemeRelation: async (rel) => {
    await db.feedbackThemes.put(rel);
    set(s => ({ feedbackThemes: [...s.feedbackThemes.filter(r => !(r.feedbackId === rel.feedbackId && r.themeId === rel.themeId)), rel] }));
  },

  removeFeedbackThemeRelation: async (feedbackId, themeId) => {
    await db.feedbackThemes.delete([feedbackId, themeId]);
    set(s => ({ feedbackThemes: s.feedbackThemes.filter(r => !(r.feedbackId === feedbackId && r.themeId === themeId)) }));
  },

  runClustering: async (feedbackIds) => {
    const { feedback, themes } = get();
    const targets = feedbackIds ? feedback.filter(f => feedbackIds.includes(f.id)) : feedback;
    const newRels: FeedbackThemeRelation[] = [];
    const updates: { id: string; patch: Partial<Feedback> }[] = [];

    const themeCounts = new Map<string, number>();
    for (const fb of targets) {
      const results = multiLabelClassify(fb.content, themes);
      for (const r of results) themeCounts.set(r.themeId, (themeCounts.get(r.themeId) ?? 0) + 1);
    }

    for (const fb of targets) {
      const results = multiLabelClassify(fb.content, themes);
      for (const r of results) {
        newRels.push({
          feedbackId: fb.id,
          themeId: r.themeId,
          matchScore: r.score,
          matchedKeywords: r.matchedKeywords,
          manuallyAdjusted: false,
        });
      }
      const { severity, isSevere } = determineSeverity(fb.content, results, themeCounts);
      if (severity !== fb.severity || isSevere !== fb.isSevere) {
        updates.push({ id: fb.id, patch: { severity, isSevere } });
      }
    }

    const fids = targets.map(f => f.id);
    await db.transaction('rw', db.feedbackThemes, db.feedback, async () => {
      for (const fid of fids) {
        await db.feedbackThemes.where('feedbackId').equals(fid).delete();
      }
      if (newRels.length > 0) await db.feedbackThemes.bulkAdd(newRels);
      for (const u of updates) await db.feedback.update(u.id, u.patch);
    });
    await get().loadAll();
  },

  addImprovement: async (imp) => {
    const now = new Date();
    const full: Improvement = { ...imp, id: generateId('imp'), createdAt: now, updatedAt: now };
    await db.improvements.add(full);
    set(s => ({ improvements: [...s.improvements, full] }));
  },

  updateImprovement: async (id, patch) => {
    const updated = { ...patch, updatedAt: new Date() };
    await db.improvements.update(id, updated);
    set(s => ({ improvements: s.improvements.map(i => i.id === id ? { ...i, ...updated } : i) }));
  },

  deleteImprovement: async (id) => {
    await db.improvements.delete(id);
    set(s => ({ improvements: s.improvements.filter(i => i.id !== id) }));
  },

  setImprovementStatus: async (id, status) => {
    await get().updateImprovement(id, { status });
  },

  addCourse: async (course) => {
    const c: Course = { ...course, id: generateId('course') };
    await db.courses.add(c);
    set(s => ({ courses: [...s.courses, c] }));
  },

  updateCourse: async (id, patch) => {
    await db.courses.update(id, patch);
    set(s => ({ courses: s.courses.map(c => c.id === id ? { ...c, ...patch } : c) }));
  },

  deleteCourse: async (id) => {
    await db.transaction('rw', db.courses, db.improvements, async () => {
      const imps = await db.improvements.where('courseId').equals(id).toArray();
      for (const imp of imps) {
        await db.improvements.update(imp.id, { courseId: undefined });
      }
      await db.courses.delete(id);
    });
    set(s => ({
      courses: s.courses.filter(c => c.id !== id),
      improvements: s.improvements.map(i => i.courseId === id ? { ...i, courseId: undefined } : i),
    }));
  },

  assignImprovementToCourse: async (improvementId, courseId) => {
    await get().updateImprovement(improvementId, { courseId });
  },

  getThemeStats: () => {
    const { themes, feedback, feedbackThemes } = get();
    const themeFeedbackMap = new Map<string, Feedback[]>();

    for (const rel of feedbackThemes) {
      const fb = feedback.find(f => f.id === rel.feedbackId);
      if (!fb) continue;
      if (!themeFeedbackMap.has(rel.themeId)) themeFeedbackMap.set(rel.themeId, []);
      themeFeedbackMap.get(rel.themeId)!.push(fb);
    }

    return themes.map(t => {
      const fbs = themeFeedbackMap.get(t.id) ?? [];
      const criticalCount = fbs.filter(f => f.severity === 'critical' || f.severity === 'rare-critical').length;
      const relsForTheme = feedbackThemes.filter(r => r.themeId === t.id);
      const kwCounts = new Map<string, number>();
      for (const r of relsForTheme) {
        for (const kw of r.matchedKeywords) kwCounts.set(kw, (kwCounts.get(kw) ?? 0) + 1);
      }
      const sortedKw = Array.from(kwCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
      const quotes = fbs.slice(0, 3).map(f => f.content);
      return {
        ...t,
        feedbackCount: fbs.length,
        criticalCount,
        representativeQuotes: quotes,
        matchedKeywords: sortedKw,
      };
    }).sort((a, b) => b.feedbackCount - a.feedbackCount);
  },

  getFeedbackByTheme: (themeId) => {
    const { feedback, feedbackThemes } = get();
    const fids = feedbackThemes.filter(r => r.themeId === themeId).map(r => r.feedbackId);
    return feedback.filter(f => fids.includes(f.id));
  },

  getThemesForFeedback: (feedbackId) => {
    const { themes, feedbackThemes } = get();
    const tids = feedbackThemes.filter(r => r.feedbackId === feedbackId).map(r => r.themeId);
    return themes.filter(t => tids.includes(t.id));
  },

  getImprovementsByCourse: (courseId) => {
    const { improvements } = get();
    if (courseId === undefined) return improvements.filter(i => !i.courseId);
    return improvements.filter(i => i.courseId === courseId);
  },

  filterFeedback: ({ source, severity, homework, keyword }) => {
    let list = get().feedback;
    if (source && source.length > 0) list = list.filter(f => source.includes(f.source));
    if (severity && severity.length > 0) list = list.filter(f => severity.includes(f.severity));
    if (homework) list = list.filter(f => f.homework === homework);
    if (keyword) list = list.filter(f => f.content.includes(keyword) || (f.author ?? '').includes(keyword));
    return list;
  },
}));
