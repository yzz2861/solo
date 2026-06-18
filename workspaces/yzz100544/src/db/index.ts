import Dexie, { Table } from 'dexie';
import type { Feedback, Theme, FeedbackThemeRelation, Improvement, Course } from '@/types';

export class AppDB extends Dexie {
  feedback!: Table<Feedback, string>;
  themes!: Table<Theme, string>;
  feedbackThemes!: Table<FeedbackThemeRelation, [string, string]>;
  improvements!: Table<Improvement, string>;
  courses!: Table<Course, string>;

  constructor() {
    super('CourseFeedbackDB');
    this.version(1).stores({
      feedback: 'id, source, homework, createdAt, severity',
      themes: 'id, name, isCustom',
      feedbackThemes: '[feedbackId+themeId], themeId, feedbackId',
      improvements: 'id, status, priority, courseId',
      courses: 'id, scheduledAt, courseNumber',
    });
  }
}

export const db = new AppDB();
