import type { Article, UserRole } from '@/types';

const ARTICLES_KEY = 'medical_review_articles';
const ROLE_KEY = 'medical_review_current_role';

export function loadArticles(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Article[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveArticles(articles: Article[]): void {
  try {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
  } catch (e) {
    console.error('保存失败', e);
  }
}

export function loadRole(): UserRole {
  const raw = localStorage.getItem(ROLE_KEY);
  return raw === 'doctor' ? 'doctor' : 'editor';
}

export function saveRole(role: UserRole): void {
  localStorage.setItem(ROLE_KEY, role);
}
