import { create } from 'zustand';
import type {
  Annotation,
  Article,
  ArticleStage,
  DoctorDecision,
  EditorStatus,
  UserRole,
} from '@/types';
import {
  SAMPLE_ARTICLE_AUTHOR,
  SAMPLE_ARTICLE_CONTENT,
  SAMPLE_ARTICLE_SOURCE,
  SAMPLE_ARTICLE_TITLE,
} from '@/mock/sampleArticle';
import { annotateArticle } from '@/services/annotationEngine';
import { loadArticles, loadRole, saveArticles, saveRole } from '@/services/storage';
import { splitParagraphs } from '@/services/fileIO';
import { genId } from '@/utils/id';

interface AppState {
  role: UserRole;
  articles: Article[];
  selectedArticleId: string | null;
  init: () => void;
  setRole: (r: UserRole) => void;
  getArticle: (id: string) => Article | undefined;
  importArticle: (input: {
    title: string;
    content: string;
    author?: string;
    source?: string;
  }) => Article;
  importSample: () => Article;
  importRevisionAsArticle: (article: Article) => Article;
  upsertArticle: (article: Article) => void;
  updateAnnotations: (
    articleId: string,
    updater: (anns: Annotation[]) => Annotation[]
  ) => void;
  updateAnnotation: (
    articleId: string,
    annotationId: string,
    patch: Partial<Annotation>
  ) => void;
  setEditorStatus: (
    articleId: string,
    annotationId: string,
    status: EditorStatus,
    extras?: { note?: string; revisedText?: string }
  ) => void;
  setDoctorDecision: (
    articleId: string,
    annotationId: string,
    decision: DoctorDecision,
    extras?: { advice?: string; doctorName?: string }
  ) => void;
  setStage: (articleId: string, stage: ArticleStage) => void;
  deleteArticle: (id: string) => void;
}

function ensureSample(state: AppState): AppState {
  if (state.articles.length === 0) {
    const paragraphs = splitParagraphs(SAMPLE_ARTICLE_CONTENT);
    const annotations = annotateArticle(paragraphs);
    const now = new Date().toISOString();
    const sample: Article = {
      id: genId('art'),
      title: SAMPLE_ARTICLE_TITLE,
      author: SAMPLE_ARTICLE_AUTHOR,
      source: SAMPLE_ARTICLE_SOURCE,
      content: SAMPLE_ARTICLE_CONTENT,
      paragraphs,
      createdAt: now,
      updatedAt: now,
      annotations,
      stage: annotations.length > 0 ? 'annotated' : 'imported',
    };
    const next = [sample];
    saveArticles(next);
    return { ...state, articles: next };
  }
  return state;
}

export const useAppStore = create<AppState>((set, get) => ({
  role: 'editor',
  articles: [],
  selectedArticleId: null,
  init: () => {
    const stored = loadArticles();
    const role = loadRole();
    set({ articles: stored, role });
    setTimeout(() => {
      const s = get();
      if (s.articles.length === 0) {
        const enriched = ensureSample(s);
        set({ articles: enriched.articles });
      }
    }, 0);
  },
  setRole: (r) => {
    saveRole(r);
    set({ role: r });
  },
  getArticle: (id) => get().articles.find((a) => a.id === id),
  importArticle: ({ title, content, author, source }) => {
    const paragraphs = splitParagraphs(content);
    const annotations = annotateArticle(paragraphs);
    const now = new Date().toISOString();
    const art: Article = {
      id: genId('art'),
      title,
      author,
      source,
      content,
      paragraphs,
      createdAt: now,
      updatedAt: now,
      annotations,
      stage: annotations.length > 0 ? 'annotated' : 'imported',
    };
    const next = [art, ...get().articles];
    saveArticles(next);
    set({ articles: next, selectedArticleId: art.id });
    return art;
  },
  importSample: () => {
    const paragraphs = splitParagraphs(SAMPLE_ARTICLE_CONTENT);
    const annotations = annotateArticle(paragraphs);
    const now = new Date().toISOString();
    const art: Article = {
      id: genId('art'),
      title: SAMPLE_ARTICLE_TITLE + '（副本）',
      author: SAMPLE_ARTICLE_AUTHOR,
      source: SAMPLE_ARTICLE_SOURCE,
      content: SAMPLE_ARTICLE_CONTENT,
      paragraphs,
      createdAt: now,
      updatedAt: now,
      annotations,
      stage: annotations.length > 0 ? 'annotated' : 'imported',
    };
    const next = [art, ...get().articles];
    saveArticles(next);
    set({ articles: next, selectedArticleId: art.id });
    return art;
  },
  importRevisionAsArticle: (article: Article) => {
    const existing = get().articles.find((a) => a.id === article.id);
    let merged: Article;
    if (existing) {
      merged = {
        ...existing,
        annotations: article.annotations.map((ann) => {
          const old = existing.annotations.find((o) => o.id === ann.id);
          return old ? { ...old, ...ann } : ann;
        }),
        updatedAt: new Date().toISOString(),
        stage: 'doctor_reviewed' as ArticleStage,
      };
    } else {
      merged = { ...article, updatedAt: new Date().toISOString() };
    }
    const others = get().articles.filter((a) => a.id !== merged.id);
    const next = [merged, ...others];
    saveArticles(next);
    set({ articles: next, selectedArticleId: merged.id });
    return merged;
  },
  upsertArticle: (article) => {
    const others = get().articles.filter((a) => a.id !== article.id);
    const updated = { ...article, updatedAt: new Date().toISOString() };
    const next = [updated, ...others];
    saveArticles(next);
    set({ articles: next });
  },
  updateAnnotations: (articleId, updater) => {
    const arts = get().articles.map((a) => {
      if (a.id !== articleId) return a;
      return {
        ...a,
        annotations: updater(a.annotations),
        updatedAt: new Date().toISOString(),
      };
    });
    saveArticles(arts);
    set({ articles: arts });
  },
  updateAnnotation: (articleId, annotationId, patch) => {
    get().updateAnnotations(articleId, (anns) =>
      anns.map((a) =>
        a.id === annotationId ? { ...a, ...patch } : a
      )
    );
  },
  setEditorStatus: (articleId, annotationId, status, extras) => {
    const now = new Date().toISOString();
    get().updateAnnotation(articleId, annotationId, {
      editorStatus: status,
      editorNote: extras?.note,
      editorRevisedText: extras?.revisedText,
      editorHandledAt:
        status === 'handled' || status === 'confirmed' ? now : undefined,
    });
  },
  setDoctorDecision: (articleId, annotationId, decision, extras) => {
    const now = new Date().toISOString();
    get().updateAnnotation(articleId, annotationId, {
      doctorDecision: decision,
      doctorAdvice: extras?.advice,
      doctorName: extras?.doctorName,
      doctorReviewedAt:
        decision !== 'pending' ? now : undefined,
    });
  },
  setStage: (articleId, stage) => {
    const arts = get().articles.map((a) =>
      a.id === articleId
        ? { ...a, stage, updatedAt: new Date().toISOString() }
        : a
    );
    saveArticles(arts);
    set({ articles: arts });
  },
  deleteArticle: (id) => {
    const next = get().articles.filter((a) => a.id !== id);
    saveArticles(next);
    set({ articles: next });
  },
}));
